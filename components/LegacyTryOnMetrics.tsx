'use client';
import { useState } from 'react';
type Legacy = {tryOnCount:number;successCount:number;errorCount:number;averageDurationMs:number|null;feedbackCount:number;thumbsUpPercent:number|null;topNegativeReasons:{reason:string;count:number}[]};
export function LegacyTryOnMetrics() {
  const [data,setData] = useState<Legacy|null>(null);
  const [error,setError] = useState('');
  const [busy,setBusy] = useState(false);
  async function load() {
    setBusy(true); setError('');
    try { const response=await fetch('/api/admin/metrics',{cache:'no-store'}); const body=await response.json(); if(!response.ok) throw new Error(body.error); setData(body.metrics); }
    catch(e) { setData(null); setError(e instanceof Error?e.message:'Không thể tải dữ liệu cũ.'); }
    finally { setBusy(false); }
  }
  return <details className="mt-6 rounded-2xl border border-ink/10 bg-white p-5"><summary className="cursor-pointer text-sm font-semibold">Metrics thử đồ server & feedback cũ (toàn thời gian)</summary><p className="mt-3 text-xs text-ink/55">Giữ lại số liệu Supabase trước khi có analytics mới. Không áp dụng bộ lọc và không cộng vào các thống kê bên trên.</p><button onClick={()=>void load()} disabled={busy} className="btn-secondary mt-4 px-4 py-2 text-sm">{busy?'Đang tải…':'Tải metrics cũ'}</button>{error&&<p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}{data&&<div className="mt-4 space-y-2 text-sm"><p>{data.tryOnCount} lượt thử · {data.successCount} thành công · {data.errorCount} lỗi</p><p>Thành công: {data.tryOnCount?`${(data.successCount/data.tryOnCount*100).toFixed(1)}%`:'Chưa có dữ liệu'} (n={data.tryOnCount})</p><p>Thời gian xử lý trung bình: {data.averageDurationMs===null?'Chưa có dữ liệu':`${(data.averageDurationMs/1000).toFixed(1)} giây`} (n={data.tryOnCount})</p><p>👍: {data.thumbsUpPercent===null?'Chưa có dữ liệu':`${data.thumbsUpPercent}%`} (n={data.feedbackCount})</p>{data.topNegativeReasons.map(r=><p key={r.reason}>{r.reason}: {r.count}</p>)}</div>}</details>;
}
