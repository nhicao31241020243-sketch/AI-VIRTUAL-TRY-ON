import { NextResponse } from 'next/server';
import {
  ADMIN_METRICS_COOKIE,
  getAdminMetricsPassword,
  isAdminMetricsSessionValid,
} from '@/lib/admin-metrics-auth';
import { createSupabaseAdminClient } from '@/lib/supabase-admin';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const password = getAdminMetricsPassword();
  if (!password) {
    return NextResponse.json(
      { error: 'Trang metrics chưa được cấu hình mật khẩu quản trị hợp lệ (tối thiểu 12 ký tự).' },
      { status: 503 },
    );
  }
  const cookieHeader = request.headers.get('cookie') ?? '';
  const sessionCookie = cookieHeader
    .split(';')
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith(`${ADMIN_METRICS_COOKIE}=`));
  const session = sessionCookie?.slice(ADMIN_METRICS_COOKIE.length + 1);
  if (!isAdminMetricsSessionValid(session, password)) {
    return NextResponse.json({ error: 'Bạn cần đăng nhập để xem số liệu.' }, { status: 401 });
  }

  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase.rpc('get_tryon_admin_metrics');
    if (error) {
      console.error('Không thể truy vấn metrics Supabase.', error.code);
      return NextResponse.json({ error: 'Không thể tải số liệu quản trị lúc này.' }, { status: 503 });
    }
    return NextResponse.json(
      { metrics: data },
      { headers: { 'Cache-Control': 'private, no-store, max-age=0' } },
    );
  } catch {
    console.error('Không thể kết nối Supabase để tải metrics quản trị.');
    return NextResponse.json({ error: 'Dịch vụ metrics chưa được cấu hình.' }, { status: 503 });
  }
}
