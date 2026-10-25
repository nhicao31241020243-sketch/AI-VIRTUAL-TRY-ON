'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { LockKeyhole, LogOut, RefreshCw } from 'lucide-react';

interface NegativeReasonMetric {
  reason: string;
  count: number;
}

interface AdminMetrics {
  tryOnCount: number;
  successCount: number;
  errorCount: number;
  successRatePercent: number | null;
  averageDurationMs: number | null;
  feedbackCount: number;
  thumbsUpPercent: number | null;
  topNegativeReasons: NegativeReasonMetric[];
}

function isAdminMetrics(value: unknown): value is AdminMetrics {
  if (typeof value !== 'object' || value === null) return false;
  const metrics = value as Record<string, unknown>;
  return (
    typeof metrics.tryOnCount === 'number'
    && typeof metrics.successCount === 'number'
    && typeof metrics.errorCount === 'number'
    && (typeof metrics.successRatePercent === 'number' || metrics.successRatePercent === null)
    && (typeof metrics.averageDurationMs === 'number' || metrics.averageDurationMs === null)
    && typeof metrics.feedbackCount === 'number'
    && (typeof metrics.thumbsUpPercent === 'number' || metrics.thumbsUpPercent === null)
    && Array.isArray(metrics.topNegativeReasons)
    && metrics.topNegativeReasons.every((item) => (
      typeof item === 'object'
      && item !== null
      && 'reason' in item
      && typeof item.reason === 'string'
      && 'count' in item
      && typeof item.count === 'number'
    ))
  );
}

async function readApiResponse(response: Response): Promise<Record<string, unknown>> {
  let body: unknown;
  try {
    body = await response.json() as unknown;
  } catch {
    throw new Error('Máy chủ trả về dữ liệu không hợp lệ.');
  }
  if (typeof body !== 'object' || body === null) {
    throw new Error('Máy chủ trả về dữ liệu không hợp lệ.');
  }
  if (!response.ok) {
    const error = 'error' in body && typeof body.error === 'string'
      ? body.error
      : 'Không thể hoàn tất yêu cầu.';
    throw new Error(error);
  }
  return body as Record<string, unknown>;
}

function formatDuration(milliseconds: number | null): string {
  return milliseconds === null ? 'Chưa có dữ liệu' : `${(milliseconds / 1000).toFixed(1)} giây`;
}

export default function AdminMetricsPage() {
  const [password, setPassword] = useState('');
  const [authenticated, setAuthenticated] = useState(false);
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadMetrics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/admin/metrics', {
        cache: 'no-store',
        credentials: 'same-origin',
      });
      const body = await readApiResponse(response);
      if (!isAdminMetrics(body.metrics)) throw new Error('Dữ liệu metrics không đúng định dạng.');
      setMetrics(body.metrics);
      setAuthenticated(true);
    } catch (loadError) {
      if (loadError instanceof Error && loadError.message === 'Bạn cần đăng nhập để xem số liệu.') {
        setAuthenticated(false);
        setMetrics(null);
        setError(null);
      } else {
        setError(loadError instanceof Error ? loadError.message : 'Không thể tải số liệu.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadMetrics();
  }, [loadMetrics]);

  const logIn = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch('/api/admin/metrics/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ password }),
      });
      await readApiResponse(response);
      setPassword('');
      await loadMetrics();
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : 'Không thể đăng nhập.');
    } finally {
      setSubmitting(false);
    }
  };

  const logOut = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch('/api/admin/metrics/login', {
        method: 'DELETE',
        credentials: 'same-origin',
      });
      await readApiResponse(response);
      setAuthenticated(false);
      setMetrics(null);
    } catch (logoutError) {
      setError(logoutError instanceof Error ? logoutError.message : 'Không thể đăng xuất.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="container-wide min-h-[65vh] py-10 sm:py-14">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="eyebrow">Quản trị</p>
          <h1 className="mt-2 font-display text-3xl font-bold sm:text-4xl">Metrics thử đồ AI</h1>
          <p className="mt-2 text-sm text-ink/60">Dữ liệu tổng hợp từ Supabase; không lưu ảnh người dùng.</p>
        </div>
        {authenticated && (
          <div className="flex gap-2">
            <button type="button" onClick={() => void loadMetrics()} disabled={loading} className="btn-secondary py-3">
              <RefreshCw size={16} /> Làm mới
            </button>
            <button type="button" onClick={() => void logOut()} disabled={submitting} className="btn-secondary py-3">
              <LogOut size={16} /> Đăng xuất
            </button>
          </div>
        )}
      </div>

      {loading && !authenticated ? (
        <p className="mt-8 text-sm text-ink/60" role="status">Đang kiểm tra phiên đăng nhập...</p>
      ) : !authenticated ? (
        <form onSubmit={logIn} className="mt-8 max-w-md rounded-2xl border border-ink/10 bg-white p-6 shadow-soft">
          <label className="block text-sm font-semibold">
            Mật khẩu quản trị
            <input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-2 w-full rounded-lg border border-ink/15 bg-cream px-3 py-3 font-normal"
            />
          </label>
          <button type="submit" disabled={submitting} className="btn-primary mt-4 w-full py-3 disabled:opacity-50">
            <LockKeyhole size={17} /> {submitting ? 'Đang đăng nhập...' : 'Đăng nhập'}
          </button>
        </form>
      ) : metrics ? (
        <>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ['Số lượt thử', metrics.tryOnCount.toLocaleString('vi-VN')],
              [
                'Tỷ lệ thành công / lỗi',
                metrics.successRatePercent === null
                  ? 'Chưa có dữ liệu'
                  : `${metrics.successRatePercent}% / ${(100 - metrics.successRatePercent).toFixed(1)}%`,
              ],
              ['Thời gian xử lý trung bình', formatDuration(metrics.averageDurationMs)],
              ['Tỷ lệ 👍', metrics.thumbsUpPercent === null ? 'Chưa có dữ liệu' : `${metrics.thumbsUpPercent}%`],
            ].map(([label, value]) => (
              <article key={label} className="rounded-2xl border border-ink/10 bg-white p-5 shadow-soft">
                <p className="text-sm text-ink/55">{label}</p>
                <p className="mt-3 font-display text-2xl font-bold">{value}</p>
              </article>
            ))}
          </div>
          <section className="mt-6 rounded-2xl border border-ink/10 bg-white p-6 shadow-soft">
            <div className="flex flex-wrap justify-between gap-2">
              <h2 className="font-display text-xl font-bold">Top lý do 👎</h2>
              <p className="text-sm text-ink/55">{metrics.successCount} thành công · {metrics.errorCount} lỗi · {metrics.feedbackCount} đánh giá</p>
            </div>
            {metrics.topNegativeReasons.length === 0 ? (
              <p className="mt-4 text-sm text-ink/60">Chưa có đánh giá 👎.</p>
            ) : (
              <ol className="mt-4 space-y-3">
                {metrics.topNegativeReasons.map((item) => (
                  <li key={item.reason} className="flex justify-between gap-4 text-sm">
                    <span>{item.reason}</span>
                    <span className="font-semibold">{item.count}</span>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </>
      ) : null}

      {error && <p role="alert" className="mt-4 text-sm text-red-700">{error}</p>}
    </main>
  );
}
