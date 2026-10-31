'use client';
import { useEffect, useState } from 'react';
import { trackingAllowed, stopTracking } from '@/lib/analytics-client';
export function AnalyticsPreference() {
  const [enabled,setEnabled] = useState(false);
  useEffect(() => { setEnabled(trackingAllowed()); },[]);
  return <div className="mt-5 flex flex-wrap items-center gap-3 text-xs text-ink/60"><a className="underline" href="/privacy">Quyền riêng tư & phân tích</a><button className="rounded-lg border border-ink/20 px-3 py-2 hover:bg-sand" onClick={() => {
    try { localStorage.setItem('ao.analytics.disabled',enabled ? '1' : '0'); if (enabled) stopTracking(); setEnabled(trackingAllowed()); window.dispatchEvent(new Event('analytics-preference')); } catch { /* Storage disabled: tracking stays off. */ }
  }} aria-pressed={enabled}>{enabled ? 'Tắt phân tích hành vi' : 'Cho phép phân tích hành vi'}</button><span>Luôn tôn trọng DNT/GPC của trình duyệt.</span></div>;
}
