import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { randomUUID } from 'node:crypto';

// Compile pure TypeScript modules in memory; no new test dependency or generated repo files.
function load(file) {
  const source = readFileSync(new URL(file, import.meta.url),'utf8');
  const output = ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
  const exports = {}; new Function('exports',output)(exports); return exports;
}
const { summarize, ratio } = load('../lib/analytics-summary.ts');
const { isClientEvent } = load('../lib/analytics-schema.ts');
const now = Date.parse('2026-11-01T12:00:00Z');
const day = 86400000;
const filters = {days:30,page:'',feature:'',source:'',device:''};
const base = {visitor:'visitor-a',session:'session-a',firstSeen:new Date(now-3*day).toISOString(),source:'direct',device:'desktop',landing:'/',page:'/',feature:'page',view:'view-a',suspect:null};
const event = (extra={}) => ({...base,id:randomUUID(),at:new Date(now-60000).toISOString(),kind:'page_view',...extra});
const dataset = events => ({events,feedback:[],quality:[]});
test('empty ratios remain null with an explicit zero sample',()=>{
  assert.deepEqual(ratio(0,0),{count:0,sample:0,percent:null});
  assert.equal(summarize(dataset([]),filters,now).conversion.rate.percent,null);
});
test('validation rejects payload fields, unbounded time, query paths and unknown targets',()=>{
  const item={id:randomUUID(),view:randomUUID(),page:'/',feature:'page',kind:'page_view'};
  assert.equal(isClientEvent(item),true);
  for(const patch of [{page:'/?email=private'}, {email:'private'}, {kind:'engagement',value:15001}, {kind:'scroll',value:26}, {kind:'click',target:'arbitrary text'}]) assert.equal(isClientEvent({...item,...patch}),false);
  assert.equal(isClientEvent({...item,kind:'engagement',value:5000}),true);
});
test('whole suspect session is excluded, including earlier unflagged events',()=>{
  const result=summarize(dataset([event(),event({kind:'click',feature:'tryon',target:'tryon-open',suspect:'burst'}),event({session:'session-b',visitor:'visitor-b',view:'view-b'})]),filters,now);
  assert.equal(result.traffic.sessions,1); assert.equal(result.traffic.views,1);
  assert.equal(result.quality.excludedEvents,2); assert.equal(result.quality.abnormalClicks,1);
});
test('CTR deduplicates repeated clicks and excludes clicks without exposure from numerator',()=>{
  const result=summarize(dataset([event(),event({kind:'impression',target:'tryon-open'}),event({kind:'click',target:'tryon-open'}),event({kind:'click',target:'tryon-open'}),event({view:'other',kind:'click',target:'tryon-open'})]),filters,now);
  assert.deepEqual(result.interactions.ctr[0],{label:'tryon-open',count:1,sample:1,percent:100});
});
test('funnel respects step order and requires all steps in the same session',()=>{
  const result=summarize(dataset([event(),event({kind:'conversion',target:'tryon-success',order:0}),event({kind:'conversion',target:'tryon-start',order:1}),event({kind:'conversion',target:'add-to-cart',order:2}),event({session:'b',kind:'conversion',target:'tryon-success',order:3})]),filters,now);
  assert.deepEqual(result.conversion.funnel.map(r=>r.count),[1,0,0]);
});
test('feature filter preserves page-view denominators for the matching view only',()=>{
  const result=summarize(dataset([event(),event({kind:'click',feature:'tryon',target:'tryon-open'}),event({view:'unrelated',session:'other'})]),{...filters,feature:'tryon'},now);
  assert.equal(result.traffic.views,1); assert.equal(result.traffic.sessions,1);
});
test('retention excludes immature cohorts and checks actual return windows',()=>{
  const first=new Date(now-3*day).toISOString();
  const result=summarize(dataset([event({at:first,firstSeen:first}),event({at:new Date(now-1.5*day).toISOString(),firstSeen:first,session:'return'}),event({visitor:'too-new',firstSeen:new Date(now-day/2).toISOString(),session:'new',view:'new'})]),filters,now);
  assert.equal(result.retention[0].sample,1); assert.equal(result.retention[0].count,1);
  assert.equal(result.retention[1].sample,0); assert.equal(result.retention[2].percent,null);
});
test('filters affect feedback; global invalid-request counters remain explicitly global',()=>{
  const data=dataset([event()]); data.feedback=[{...base,id:'f',at:new Date(now-1000).toISOString(),rating:'up',comment:'hello',feature:'cart'}]; data.quality=[{at:new Date(now-1000).toISOString(),reason:'invalid',count:3}];
  const result=summarize(data,{...filters,feature:'tryon'},now);
  assert.equal(result.feedback.total,0); assert.equal(result.quality.counters[0].count,3);
});
