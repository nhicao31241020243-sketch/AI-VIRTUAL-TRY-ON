import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
const base='http://localhost:3101';
const password=process.env.ANALYTICS_TEST_PASSWORD;
if (!password) throw new Error('Set ANALYTICS_TEST_PASSWORD; run only against the isolated development server on port 3101.');
class Client {
  jar=new Map();
  constructor(ua='Mozilla/5.0 AnalyticsIntegrationCheck',ip='127.0.0.10'){this.ua=ua;this.ip=ip;}
  async request(path,method='GET',body,headers={}){
    const response=await fetch(base+path,{method,redirect:'manual',headers:{'user-agent':this.ua,'x-forwarded-for':this.ip,cookie:[...this.jar].map(([k,v])=>`${k}=${v}`).join('; '),...(body?{'content-type':'application/json'}:{}),...headers},body:body?JSON.stringify(body):undefined});
    for(const cookie of response.headers.getSetCookie()) { const first=cookie.split(';')[0]; const index=first.indexOf('='); if(!/Path=\/api\/admin(?:;|$)/i.test(cookie)) this.jar.set(first.slice(0,index),first.slice(index+1)); }
    return response;
  }
}
const admin=new Client();
assert.equal((await admin.request('/admin/metrics')).status,307);
assert.equal((await admin.request('/api/admin/analytics')).status,401);
assert.equal((await admin.request('/api/admin/metrics')).status,401);
assert.equal((await admin.request('/api/admin/metrics/login','POST',{password:'wrong'})).status,401);
assert.equal((await admin.request('/api/admin/metrics/login','POST',{password},{origin:'https://outside.invalid'})).status,403);
const login=await admin.request('/api/admin/metrics/login','POST',{password});
assert.equal(login.status,200); assert.match(login.headers.get('set-cookie'),/HttpOnly/i);
assert.equal((await admin.request('/admin/metrics')).status,200);
assert.equal((await admin.request('/api/admin/analytics?days=999')).status,400);
const user=new Client('Mozilla/5.0 AnalyticsIntegrationCheck','127.0.0.11');
const view=randomUUID();
const event=(kind,extra={})=>({id:randomUUID(),view,page:'/',feature:'page',kind,...extra});
const pv=event('page_view');
assert.equal((await user.request('/api/analytics/events','POST',{events:[{...pv,email:'no personal data'}]})).status,400);
assert.equal((await user.request('/api/analytics/events','POST',{events:[pv]},{origin:'https://outside.invalid'})).status,403);
assert.equal((await user.request('/api/analytics/events','POST',{events:[pv],source:'search'})).status,200);
assert.equal((await (await user.request('/api/analytics/events','POST',{events:[pv]})).json()).duplicates,1);
const journey=[event('impression',{target:'tryon-open',feature:'tryon'}),event('click',{target:'tryon-open',feature:'tryon'}),event('engagement',{value:5000}),event('scroll',{value:100}),...['tryon-start','tryon-success','add-to-cart'].map(target=>event('conversion',{target,feature:target==='add-to-cart'?'cart':'tryon'}))];
assert.equal((await user.request('/api/analytics/events','POST',{events:journey})).status,200);
const payload={requestId:randomUUID(),revision:0,page:'/',feature:'page',rating:'down',reason:'Khó sử dụng',comment:'[INTEGRATION TEST] Feedback idempotency check.'};
assert.equal((await user.request('/api/analytics/feedback','POST',{...payload,comment:'x'.repeat(501)})).status,400);
assert.equal((await user.request('/api/analytics/feedback','POST',payload)).status,200);
assert.equal((await user.request('/api/analytics/feedback','POST',payload)).status,200);
assert.equal((await user.request('/api/analytics/feedback','POST',{...payload,requestId:randomUUID()})).status,409);
const edit={...payload,requestId:randomUUID(),revision:1,rating:'up',reason:null,comment:'[INTEGRATION TEST] Updated feedback.'};
assert.equal((await user.request('/api/analytics/feedback','POST',edit)).status,200);
const own=await (await user.request('/api/analytics/feedback?page=%2F&feature=page')).json(); assert.equal(own.feedback.revision,2); assert.equal(own.feedback.rating,'up');
const outsider=new Client(); assert.equal((await (await outsider.request('/api/analytics/feedback?page=%2F&feature=page')).json()).feedback,null);
const bot=new Client('test-crawler','127.0.0.12'); assert.equal((await bot.request('/api/analytics/events','POST',{events:[event('page_view',{view:randomUUID()})]})).status,200);
const burst=new Client('Mozilla/5.0 BurstCheck','127.0.0.13'); await burst.request('/api/analytics/events','POST',{events:[event('page_view',{view:randomUUID()})]});
for(const n of [30,1]) assert.equal((await burst.request('/api/analytics/events','POST',{events:Array.from({length:n},()=>event('click',{target:'tryon-open',feature:'tryon'}))})).status,200);
const data=await (await admin.request('/api/admin/analytics')).json();
assert.equal(data.mode,'local-development'); assert.equal(data.summary.feedback.total,1); assert.equal(data.summary.feedback.up.count,1);
assert.equal(data.summary.conversion.funnel[2].count,1); assert.equal(data.summary.quality.suspectSessions,2);
assert.equal(data.summary.traffic.visitors,1);
assert.ok(data.summary.quality.counters.some(c=>c.label==='duplicate_feedback'&&c.count===1));
assert.equal((await (await admin.request('/api/admin/analytics?device=mobile')).json()).summary.traffic.visitors,0);
assert.equal((await (await admin.request('/api/admin/analytics?source=search')).json()).summary.traffic.visitors,1);
const throttled=new Client('Mozilla/5.0 LimitCheck','127.0.0.14'); let status=0;
for(let i=0;i<31;i++) status=(await throttled.request('/api/analytics/feedback','POST',{})).status;
assert.equal(status,429);
assert.equal((await admin.request('/api/admin/metrics/login','DELETE',undefined,{origin:'https://outside.invalid'})).status,403);
assert.equal((await admin.request('/api/admin/metrics/login','DELETE')).status,200);
assert.equal((await admin.request('/api/admin/analytics')).status,401);
assert.equal((await admin.request('/admin/metrics')).status,307);
console.log('PASS: protected route/API, login/logout/CSRF, validation, idempotency, revisions, privacy isolation, funnel, filters, bot/burst exclusion, rate limiting. Synthetic records exist only in the isolated test data directory.');
