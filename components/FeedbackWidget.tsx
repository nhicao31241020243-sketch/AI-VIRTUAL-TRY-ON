'use client';
import { useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { ThumbsDown, ThumbsUp } from 'lucide-react';
import { REASONS, type Feature, type Feedback } from '@/lib/analytics-schema';
import { flushAnalytics } from '@/lib/analytics-client';
export function FeedbackWidget({ feature = 'page', title = 'Trải nghiệm này có hữu ích không?' }: { feature?: Feature; title?: string }) {
  const page = usePathname();
  const [rating,setRating] = useState<'up'|'down'|null>(null);
  const [reason,setReason] = useState<Feedback['reason']>(null);
  const [comment,setComment] = useState('');
  const [status,setStatus] = useState<'idle'|'loading'|'sending'|'success'|'error'>('idle');
  const [error,setError] = useState('');
  const [ready,setReady] = useState(false);
  const busy = useRef(false);
  const revision = useRef(0);
  const pending = useRef<{ key: string; requestId: string } | null>(null);
  async function load(nextRating?: 'up'|'down') {
    if (busy.current) return;
    busy.current = true; setStatus('loading'); setError('');
    try {
      await flushAnalytics();
      const response = await fetch(`/api/analytics/feedback?page=${encodeURIComponent(page)}&feature=${feature}`, { cache:'no-store' });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Không thể tải đánh giá.');
      const previous = body.feedback as Feedback | null;
      revision.current = previous?.revision || 0;
      setRating(nextRating || previous?.rating || null); setReason(previous?.reason || null); setComment(previous?.comment || '');
      pending.current = null; setReady(true); setStatus('idle');
    } catch(e) { setError(e instanceof Error ? e.message : 'Không thể tải đánh giá.'); setStatus('error'); }
    finally { busy.current = false; }
  }
  function select(value: 'up'|'down') {
    if (!ready) { void load(value); return; }
    setRating(value); if (value === 'up') setReason(null); setStatus('idle'); setError('');
  }
  async function send() {
    if (busy.current || !ready || !rating) return;
    busy.current = true; setStatus('sending'); setError('');
    const payload = { page, feature, rating, reason: rating === 'down' ? reason : null, comment, revision: revision.current };
    const key = JSON.stringify(payload);
    if (pending.current?.key !== key) pending.current = { key, requestId: crypto.randomUUID() };
    try {
      const response = await fetch('/api/analytics/feedback', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({...payload,requestId:pending.current.requestId}), signal:AbortSignal.timeout(15000) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Không thể gửi đánh giá.');
      revision.current = body.revision; pending.current = null; setStatus('success');
    } catch(e) { setError(e instanceof Error ? e.message : 'Không thể gửi. Vui lòng thử lại.'); setStatus('error'); }
    finally { busy.current = false; }
  }
  const disabled = status === 'loading' || status === 'sending';
  return <section className="rounded-2xl border border-ink/10 bg-white p-5" aria-label="Phản hồi trải nghiệm">
    <h2 className="text-sm font-semibold">{title}</h2>
    <div className="mt-3 flex flex-wrap gap-2">{(['up','down'] as const).map(value => <button type="button" key={value} aria-pressed={rating === value} disabled={disabled} onClick={() => select(value)} className={`btn-secondary px-4 py-2 disabled:opacity-50 ${rating === value ? 'border-moss bg-sand text-moss' : ''}`} aria-label={value === 'up' ? 'Hữu ích' : 'Chưa hữu ích'}>{value === 'up' ? <ThumbsUp size={17}/> : <ThumbsDown size={17}/>} {value === 'up' ? 'Hữu ích' : 'Chưa tốt'}</button>)}</div>
    {ready && rating && <form className="mt-4 space-y-3" onSubmit={event => { event.preventDefault(); void send(); }}>
      {rating === 'down' && <fieldset disabled={disabled}><legend className="mb-2 text-sm">Điều gì cần cải thiện?</legend><div className="flex flex-wrap gap-2">{REASONS.map(value => <label key={value} className="flex items-center gap-2 rounded-lg border border-ink/15 px-3 py-2 text-xs"><input type="radio" name={`feedback-reason-${feature}`} value={value} required checked={reason === value} onChange={() => {setReason(value); setStatus('idle');}}/>{value}</label>)}</div></fieldset>}
      <label className="block text-sm">Nhận xét (không bắt buộc)<textarea value={comment} maxLength={500} disabled={disabled} onChange={e => {setComment(e.target.value); setStatus('idle');}} className="mt-2 block w-full rounded-lg border border-ink/20 p-3" rows={3} placeholder="Xin đừng nhập thông tin cá nhân."/><span className="mt-1 block text-xs text-ink/55">{comment.length}/500 · Chỉ quản trị viên xem được.</span></label>
      <button className="btn-primary px-4 py-2 disabled:opacity-50" disabled={disabled || status === 'success'}>{status === 'sending' ? 'Đang gửi…' : status === 'error' ? 'Thử gửi lại' : revision.current ? 'Cập nhật đánh giá' : 'Gửi đánh giá'}</button>
    </form>}
    <div aria-live="polite" className="mt-3 text-sm">{status === 'loading' && 'Đang tải đánh giá…'}{status === 'success' && <p className="text-moss">Cảm ơn bạn! Bạn có thể thay đổi lựa chọn ở trên.</p>}</div>
    {error && <div role="alert" className="mt-2 text-sm text-red-700"><p>{error}</p><button className="mt-2 underline" disabled={disabled} onClick={() => void load()}>Tải lại đánh giá đã lưu</button></div>}
  </section>;
}
