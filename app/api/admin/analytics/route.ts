import { NextRequest } from 'next/server';
import { ADMIN_METRICS_COOKIE, getAdminMetricsPassword, isAdminMetricsSessionValid } from '@/lib/admin-metrics-auth';
import { json } from '@/lib/analytics-http';
import { readDataset } from '@/lib/analytics-store';
import { summarize } from '@/lib/analytics-summary';
import { PAGES, FEATURES, SOURCES, DEVICES, type Filters } from '@/lib/analytics-schema';

export const runtime = 'nodejs';
export async function GET(request: NextRequest) {
  const password = getAdminMetricsPassword();
  if (!password || !isAdminMetricsSessionValid(request.cookies.get(ADMIN_METRICS_COOKIE)?.value, password)) return json({ error: 'Bạn cần đăng nhập quản trị.' }, 401);
  const p = request.nextUrl.searchParams;
  const filters: Filters = { days: Number(p.get('days') || 30) as Filters['days'], page: p.get('page') || '', feature: p.get('feature') || '', source: p.get('source') || '', device: p.get('device') || '' };
  if (![7,30,90].includes(filters.days) || [[PAGES, filters.page], [FEATURES, filters.feature], [SOURCES, filters.source], [DEVICES, filters.device]].some(([list, value]) => value && !(list as readonly string[]).includes(value as string))) return json({ error: 'Bộ lọc không hợp lệ.' }, 400);
  try {
    const { data, mode, truncated } = await readDataset();
    return json({ summary: summarize(data, filters), mode, truncated });
  } catch { return json({ error: 'Chưa thể tải dữ liệu. Kiểm tra Supabase và migration analytics, rồi thử lại.' }, 503); }
}
