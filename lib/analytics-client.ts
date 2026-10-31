'use client';
import { PAGES, type ClientEvent, type Feature, type Page, type Source, type Target } from './analytics-schema';
let active: { page: Page; view: string } | null = null;
let queue: ClientEvent[] = [];
let sending: Promise<void> | null = null;
let retryAt = 0;
let failures = 0;
export function trackingAllowed() {
  try { return localStorage.getItem('ao.analytics.disabled') !== '1' && navigator.doNotTrack !== '1' && !(navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl; }
  catch { return false; }
}
export function source(): Source {
  const medium = new URLSearchParams(location.search).get('utm_medium')?.toLowerCase();
  if (medium === 'email') return 'email';
  if (medium === 'social') return 'social';
  if (medium && ['cpc','ppc','paid','display','affiliate'].includes(medium)) return 'campaign';
  try {
    const host = new URL(document.referrer).hostname;
    if (host === location.hostname) return 'direct';
    if (/(^|\.)(google\.[a-z.]+|bing.com|duckduckgo.com|yahoo.com)$/.test(host)) return 'search';
    if (/(^|\.)(facebook.com|instagram.com|t.co|tiktok.com|linkedin.com)$/.test(host)) return 'social';
    return 'referral';
  } catch { return 'direct'; }
}
export function beginView(page: string) {
  if (!PAGES.includes(page as Page) || !trackingAllowed()) { active = null; return; }
  active = { page: page as Page, view: crypto.randomUUID() };
  track('page_view', 'page'); void flushAnalytics();
}
export function endView() { active = null; }
export function track(kind: ClientEvent['kind'], feature: Feature, target?: Target, value?: number) {
  if (!active || !trackingAllowed()) return;
  if (queue.length >= 120) queue.shift();
  queue.push({ ...active, id: crypto.randomUUID(), kind, feature, ...(target ? { target } : {}), ...(value === undefined ? {} : { value }) });
}
export function stopTracking() { active = null; queue = []; }
export async function flushAnalytics(): Promise<void> {
  if (sending) { await sending; if (queue.length && Date.now() >= retryAt) await flushAnalytics(); return; }
  if (!queue.length || Date.now() < retryAt) return;
  if (!trackingAllowed()) { stopTracking(); return; }
  const batch = queue.splice(0,30);
  sending = (async () => {
    try {
      const response = await fetch('/api/analytics/events', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', keepalive: true, body: JSON.stringify({ events: batch, source: source() }), signal: AbortSignal.timeout(10000) });
      if (!response.ok && (response.status === 429 || response.status >= 500)) {
        retryAt = Date.now() + Math.min(300000, Math.max(15000 * 2 ** Math.min(++failures,4), Number(response.headers.get('Retry-After') || 0) * 1000));
        queue = [...batch, ...queue].slice(0,120);
      } else { failures = 0; }
    } catch { failures++; retryAt = Date.now() + Math.min(300000,15000 * 2 ** Math.min(failures,4)); queue = [...batch,...queue].slice(0,120); }
  })();
  try { await sending; } finally { sending = null; }
}
