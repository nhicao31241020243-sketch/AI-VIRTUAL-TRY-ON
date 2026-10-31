import 'server-only';
import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { PAGES, SOURCES, type Context, type Page, type Source } from './analytics-schema';

const development = globalThis as typeof globalThis & { analyticsDevSecret?: string };
const devSecret = development.analyticsDevSecret ||= randomUUID();
function secret() {
  const key = process.env.ANALYTICS_SECRET || process.env.ADMIN_METRICS_PASSWORD;
  if (key && key.length >= 32) return key;
  if (process.env.NODE_ENV === 'development') return devSecret;
  throw new Error('Cần ANALYTICS_SECRET tối thiểu 32 ký tự.');
}
function sign(value: string) { return createHmac('sha256', secret()).update(value).digest('base64url'); }
function encode(value: object) { const raw = Buffer.from(JSON.stringify(value)).toString('base64url'); return `${raw}.${sign(raw)}`; }
function decode<T>(value?: string): T | null {
  if (!value || value.length > 2000) return null;
  const [raw, signature] = value.split('.');
  if (!raw || !signature) return null;
  const expected = Buffer.from(sign(raw));
  const actual = Buffer.from(signature);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;
  try { return JSON.parse(Buffer.from(raw, 'base64url').toString()) as T; } catch { return null; }
}
export function identity(request: NextRequest, page: Page, source?: Source) {
  const now = Date.now();
  let visitor = decode<{ id: string; firstSeen: string; expires: number }>(request.cookies.get('ao_visitor')?.value);
  if (!visitor || visitor.expires <= now) visitor = { id: randomUUID(), firstSeen: new Date(now).toISOString(), expires: now + 90 * 86400000 };
  let session = decode<{ id: string; visitor: string; expires: number; source: Source; landing: Page }>(request.cookies.get('ao_session')?.value);
  if (!session || session.expires <= now || session.visitor !== visitor.id) {
    session = { id: randomUUID(), visitor: visitor.id, expires: now, source: SOURCES.includes(source as Source) ? source! : 'direct', landing: PAGES.includes(page) ? page : '/' };
  }
  session.expires = now + 30 * 60000;
  const ua = request.headers.get('user-agent') || '';
  const context: Context = { visitor: visitor.id, firstSeen: visitor.firstSeen, session: session.id, source: session.source, landing: session.landing, device: /ipad|tablet/i.test(ua) ? 'tablet' : /mobile|android|iphone/i.test(ua) ? 'mobile' : 'desktop' };
  return {
    context,
    bot: !ua || /bot|crawler|spider|headless|curl|wget/i.test(ua),
    attach(response: NextResponse) {
      const options = { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax' as const, path: '/' };
      response.cookies.set('ao_visitor', encode(visitor!), { ...options, maxAge: Math.max(1, Math.floor((visitor!.expires - now) / 1000)) });
      response.cookies.set('ao_session', encode(session!), { ...options, maxAge: 1800 });
      return response;
    },
  };
}
export function sameOrigin(request: Request) {
  const origin = request.headers.get('origin');
  return (!origin || origin === new URL(request.url).origin) && request.headers.get('sec-fetch-site') !== 'cross-site';
}
export function ipKey(request: Request) {
  // Only trust these headers behind a proxy that overwrites them. Never persist the raw IP.
  const ip = (request.headers.get('x-forwarded-for')?.split(',')[0] || request.headers.get('x-real-ip') || 'unknown').trim().slice(0, 100);
  return createHmac('sha256', secret()).update(ip).digest('hex');
}
export async function limitedJson(request: Request, max = 24000): Promise<unknown> {
  if (request.headers.get('content-type')?.split(';')[0] !== 'application/json') throw new Error('JSON required');
  if (!request.body || Number(request.headers.get('content-length')) > max) throw new Error('Body too large');
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.length;
      if (length > max) { await reader.cancel(); throw new Error('Body too large'); }
      chunks.push(value);
    }
    return JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown;
  } finally { reader.releaseLock(); }
}
export function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { 'Cache-Control': 'private, no-store', 'Vary': 'Cookie' } });
}
