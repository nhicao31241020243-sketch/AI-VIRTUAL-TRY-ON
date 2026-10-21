'use client';

export type MetricEventType = 'try_on_click' | 'success' | 'error' | 'dwell';

export interface MetricEvent {
  type: MetricEventType;
  at: number;
  inferenceTimeMs?: number;
}

const STORAGE_KEY = 'aoao.metrics.v1';

function isMetricEvent(value: unknown): value is MetricEvent {
  if (typeof value !== 'object' || value === null) return false;
  const event = value as Record<string, unknown>;
  return (
    ['try_on_click', 'success', 'error', 'dwell'].includes(String(event.type))
    && typeof event.at === 'number'
    && (event.inferenceTimeMs === undefined || typeof event.inferenceTimeMs === 'number')
  );
}

export function readMetrics(): MetricEvent[] {
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    const parsed: unknown = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed.filter(isMetricEvent) : [];
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('Không thể đọc số liệu phiên thử đồ.', error);
    }
    return [];
  }
}

export function recordMetric(event: MetricEvent): void {
  try {
    const metrics = readMetrics();
    metrics.push(event);
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(metrics));
    window.dispatchEvent(new Event('tryon-metrics-updated'));
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('Không thể lưu số liệu phiên thử đồ.', error);
    }
  }
}
