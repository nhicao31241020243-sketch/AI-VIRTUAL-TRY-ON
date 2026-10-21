'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Download, RefreshCw } from 'lucide-react';
import { readMetrics, type MetricEvent } from '@/lib/metrics';

function formatDuration(milliseconds: number): string {
  if (milliseconds < 60_000) return `${(milliseconds / 1000).toFixed(1)} giây`;
  return `${(milliseconds / 60_000).toFixed(1)} phút`;
}

function exportCsv(events: MetricEvent[]) {
  const rows = [
    ['su_kien', 'thoi_diem_iso', 'thoi_gian_ms'],
    ...events.map((event) => [
      event.type,
      new Date(event.at).toISOString(),
      event.inferenceTimeMs?.toString() ?? '',
    ]),
  ];
  const csv = `\uFEFF${rows.map((row) => row.map((value) => `"${value.replaceAll('"', '""')}"`).join(',')).join('\r\n')}`;
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'ao-ao-that-metrics.csv';
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function MetricsPage() {
  const [events, setEvents] = useState<MetricEvent[]>([]);
  const refresh = useCallback(() => setEvents(readMetrics()), []);

  useEffect(() => {
    refresh();
    window.addEventListener('tryon-metrics-updated', refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener('tryon-metrics-updated', refresh);
      window.removeEventListener('storage', refresh);
    };
  }, [refresh]);

  const summary = useMemo(() => {
    const successes = events.filter((event) => event.type === 'success');
    const failures = events.filter((event) => event.type === 'error');
    const times = events.flatMap((event) => (
      (event.type === 'success' || event.type === 'error')
      && typeof event.inferenceTimeMs === 'number'
        ? [event.inferenceTimeMs]
        : []
    ));
    const dwellTimeMs = events
      .filter((event) => event.type === 'dwell')
      .reduce((total, event) => total + (event.inferenceTimeMs ?? 0), 0);
    const completedCount = successes.length + failures.length;

    return {
      tryOnCount: completedCount,
      successCount: successes.length,
      errorCount: failures.length,
      averageMs: times.length ? times.reduce((total, time) => total + time, 0) / times.length : null,
      minMs: times.length ? Math.min(...times) : null,
      maxMs: times.length ? Math.max(...times) : null,
      successRate: completedCount ? (successes.length / completedCount) * 100 : null,
      adoptionClicks: events.filter((event) => event.type === 'try_on_click').length,
      dwellTimeMs,
    };
  }, [events]);

  const cards = [
    ['Số lượt thử', summary.tryOnCount.toString()],
    ['Thời gian inference trung bình', summary.averageMs === null ? 'Chưa có dữ liệu' : formatDuration(summary.averageMs)],
    ['Inference nhanh nhất', summary.minMs === null ? 'Chưa có dữ liệu' : formatDuration(summary.minMs)],
    ['Inference lâu nhất', summary.maxMs === null ? 'Chưa có dữ liệu' : formatDuration(summary.maxMs)],
    ['Tỷ lệ thành công', summary.successRate === null ? 'Chưa có dữ liệu' : `${summary.successRate.toFixed(1)}%`],
    ['Thành công / lỗi', `${summary.successCount} / ${summary.errorCount}`],
    ['Lượt bấm thử đồ AI', summary.adoptionClicks.toString()],
    ['Tổng thời gian ở trang', formatDuration(summary.dwellTimeMs)],
  ];

  return (
    <main className="container-wide min-h-[65vh] py-10 sm:py-14">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="eyebrow">Báo cáo trong phiên này</p>
          <h1 className="mt-2 font-display text-3xl font-bold sm:text-4xl">Chỉ số thử đồ AI</h1>
          <p className="mt-2 text-sm text-ink/60">Số liệu chỉ nằm trong sessionStorage của trình duyệt này; không có ảnh được lưu.</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={refresh} className="btn-secondary py-3"><RefreshCw size={16} /> Làm mới</button>
          <button type="button" onClick={() => exportCsv(events)} disabled={events.length === 0} className="btn-primary py-3 disabled:opacity-40"><Download size={16} /> Xuất CSV</button>
        </div>
      </div>
      {events.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-ink/20 bg-white p-8 text-center">
          <p className="font-semibold">Chưa có số liệu trong phiên này.</p>
          <p className="mt-2 text-sm text-ink/60">Hãy thử đồ hoặc tiếp tục sử dụng trang để bắt đầu ghi nhận.</p>
        </div>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map(([label, value]) => (
            <article key={label} className="rounded-2xl border border-ink/10 bg-white p-5 shadow-soft">
              <p className="text-sm text-ink/55">{label}</p>
              <p className="mt-3 font-display text-2xl font-bold">{value}</p>
            </article>
          ))}
        </div>
      )}
      <p className="mt-5 text-xs text-ink/45">Gồm {events.length} sự kiện đo trong phiên hiện tại.</p>
    </main>
  );
}
