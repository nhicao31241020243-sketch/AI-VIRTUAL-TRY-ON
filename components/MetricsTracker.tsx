'use client';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { beginView, endView, flushAnalytics, stopTracking, track, trackingAllowed } from '@/lib/analytics-client';
import { FEATURES, TARGETS, type Feature, type Target } from '@/lib/analytics-schema';
import { recordMetric } from '@/lib/metrics';
export function MetricsTracker() {
  const pathname = usePathname();
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    const sync = () => setEnabled(trackingAllowed());
    sync(); window.addEventListener('analytics-preference', sync); window.addEventListener('storage', sync);
    return () => { window.removeEventListener('analytics-preference', sync); window.removeEventListener('storage', sync); };
  }, []);
  useEffect(() => {
    if (!enabled) { stopTracking(); return; }
    beginView(pathname);
    let visible = document.visibilityState === 'visible' && document.hasFocus();
    let lastTick = performance.now();
    let lastActivity = lastTick;
    let pendingMs = 0;
    const reached = new Set<number>();
    const exposed = new Set<string>();
    const observed = new WeakSet<Element>();
    const tick = (force = false) => {
      const now = performance.now();
      const elapsed = Math.round(Math.max(0, Math.min(now, lastActivity + 60000) - lastTick));
      if (visible && elapsed > 0) pendingMs += Math.min(15000,elapsed);
      if (pendingMs >= 5000 || force) {
        while (pendingMs > 0) { const value = Math.min(15000,pendingMs); track('engagement','page',undefined,value); recordMetric({ type:'dwell', at:Date.now(), inferenceTimeMs:value }); pendingMs -= value; }
      }
      lastTick = now;
    };
    const activity = () => { tick(); lastActivity = performance.now(); };
    const visibility = () => { tick(true); visible = document.visibilityState === 'visible' && document.hasFocus(); if (visible) lastActivity = performance.now(); else void flushAnalytics(); };
    const scroll = () => {
      activity();
      if (!visible) return;
      const depth = Math.min(100, Math.round((window.scrollY + window.innerHeight) / document.documentElement.scrollHeight * 100));
      for (const value of [25,50,75,100]) if (depth >= value && !reached.has(value)) { reached.add(value); track('scroll','page',undefined,value); }
    };
    const describe = (element: HTMLElement) => {
      const target = element.dataset.analytics as Target;
      const feature = element.dataset.analyticsFeature as Feature;
      return TARGETS.includes(target) && FEATURES.includes(feature) ? { target, feature } : null;
    };
    const impression = (element: HTMLElement) => {
      const item = describe(element);
      if (!item || exposed.has(item.target)) return;
      exposed.add(item.target); track('impression',item.feature,item.target);
    };
    const click = (event: MouseEvent) => {
      if (!event.isTrusted) return;
      const element = event.target instanceof Element ? event.target.closest<HTMLElement>('[data-analytics]') : null;
      if (!element) return;
      const item = describe(element);
      if (!item) return;
      impression(element); track('click',item.feature,item.target); activity();
    };
    const observer = new IntersectionObserver(entries => entries.forEach(entry => { if (entry.isIntersecting && visible) impression(entry.target as HTMLElement); }), { threshold: 0.5 });
    const scan = () => document.querySelectorAll<HTMLElement>('[data-analytics]').forEach(element => { if (!observed.has(element)) { observed.add(element); observer.observe(element); } });
    const mutation = new MutationObserver(scan);
    scan(); scroll(); mutation.observe(document.body,{ childList:true, subtree:true });
    const heartbeat = window.setInterval(() => tick(),5000);
    const flush = window.setInterval(() => void flushAnalytics(),15000);
    const hide = () => { tick(true); void flushAnalytics(); };
    document.addEventListener('click',click,true); document.addEventListener('keydown',activity); document.addEventListener('pointerdown',activity); document.addEventListener('visibilitychange',visibility);
    window.addEventListener('focus',visibility); window.addEventListener('blur',visibility); window.addEventListener('scroll',scroll,{passive:true}); window.addEventListener('pagehide',hide);
    return () => {
      tick(true); endView(); void flushAnalytics();
      observer.disconnect(); mutation.disconnect(); clearInterval(heartbeat); clearInterval(flush);
      document.removeEventListener('click',click,true); document.removeEventListener('keydown',activity); document.removeEventListener('pointerdown',activity); document.removeEventListener('visibilitychange',visibility);
      window.removeEventListener('focus',visibility); window.removeEventListener('blur',visibility); window.removeEventListener('scroll',scroll); window.removeEventListener('pagehide',hide);
    };
  },[pathname, enabled]);
  return null;
}
