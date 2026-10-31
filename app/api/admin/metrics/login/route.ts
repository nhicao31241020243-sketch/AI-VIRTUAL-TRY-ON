import { NextResponse } from 'next/server';
import { createRateLimiter } from '@/lib/rate-limit';
import { sameOrigin } from '@/lib/analytics-http';
import {
  ADMIN_METRICS_COOKIE,
  ADMIN_METRICS_SESSION_SECONDS,
  createAdminMetricsSession,
  getAdminMetricsPassword,
  passwordsMatch,
} from '@/lib/admin-metrics-auth';

export const runtime = 'nodejs';

const loginRateLimiter = createRateLimiter({ requests: 10, windowMs: 15 * 60_000 });
const MAX_BODY_BYTES = 2048;

function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get('x-forwarded-for');
  const ip = forwardedFor?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')?.trim()
    || 'unknown';
  return ip.slice(0, 100);
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: 'Nguồn yêu cầu không hợp lệ.' }, { status: 403 });
  const limit = await loginRateLimiter.check(getClientIp(request));
  if (!limit.allowed) {
    return NextResponse.json(
      { error: 'Bạn đã thử đăng nhập quá nhiều lần. Vui lòng chờ rồi thử lại.' },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } },
    );
  }

  const expectedPassword = getAdminMetricsPassword();
  if (!expectedPassword) {
    return NextResponse.json(
      { error: 'Trang metrics chưa được cấu hình mật khẩu quản trị hợp lệ (tối thiểu 12 ký tự).' },
      { status: 503 },
    );
  }
  if (request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json') {
    return NextResponse.json({ error: 'Yêu cầu đăng nhập không hợp lệ.' }, { status: 415 });
  }
  if (Number(request.headers.get('content-length') ?? 0) > MAX_BODY_BYTES) {
    return NextResponse.json({ error: 'Dữ liệu đăng nhập quá lớn.' }, { status: 413 });
  }

  let input: unknown;
  try {
    if (!request.body) return NextResponse.json({ error: 'Dữ liệu đăng nhập không hợp lệ.' }, { status: 400 });
    const reader = request.body.getReader();
    const chunks: Uint8Array[] = [];
    let totalBytes = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > MAX_BODY_BYTES) {
        await reader.cancel();
        return NextResponse.json({ error: 'Dữ liệu đăng nhập quá lớn.' }, { status: 413 });
      }
      chunks.push(value);
    }
    input = JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown;
  } catch {
    return NextResponse.json({ error: 'Dữ liệu đăng nhập không hợp lệ.' }, { status: 400 });
  }
  if (
    typeof input !== 'object'
    || input === null
    || !('password' in input)
    || typeof input.password !== 'string'
    || input.password.length > 256
  ) {
    return NextResponse.json({ error: 'Vui lòng nhập mật khẩu quản trị.' }, { status: 400 });
  }
  if (!passwordsMatch(input.password, expectedPassword)) {
    return NextResponse.json({ error: 'Mật khẩu quản trị không đúng.' }, { status: 401 });
  }

  const response = NextResponse.json(
    { authenticated: true },
    { headers: { 'Cache-Control': 'no-store' } },
  );
  response.cookies.set(ADMIN_METRICS_COOKIE, createAdminMetricsSession(expectedPassword), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: ADMIN_METRICS_SESSION_SECONDS,
  });
  response.headers.append('Set-Cookie', `${ADMIN_METRICS_COOKIE}=; Path=/api/admin; Max-Age=0; HttpOnly; SameSite=Lax`);
  return response;
}

export async function DELETE(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: 'Nguồn yêu cầu không hợp lệ.' }, { status: 403 });
  const response = NextResponse.json({ authenticated: false });
  response.cookies.set(ADMIN_METRICS_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
  response.headers.append('Set-Cookie', `${ADMIN_METRICS_COOKIE}=; Path=/api/admin; Max-Age=0; HttpOnly; SameSite=Lax`);
  return response;
}
