'use client';

import { useEffect } from 'react';
import { recordMetric } from '@/lib/metrics';

export function MetricsTracker() {
  useEffect(() => {
    let activeSince = performance.now();
    let finished = false;

    const saveDwell = () => {
      if (finished || document.visibilityState === 'hidden') return;
      const elapsedMs = Math.max(0, Math.round(performance.now() - activeSince));
      activeSince = performance.now();
      recordMetric({ type: 'dwell', at: Date.now(), inferenceTimeMs: elapsedMs });
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        saveDwell();
      } else {
        activeSince = performance.now();
      }
    };
    const handlePageHide = () => saveDwell();

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', handlePageHide);
    return () => {
      saveDwell();
      finished = true;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', handlePageHide);
    };
  }, []);

  return null;
}
