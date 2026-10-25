import 'server-only';

import { createHmac, timingSafeEqual } from 'node:crypto';

export const ADMIN_METRICS_COOKIE = 'aoao_admin_metrics';
export const ADMIN_METRICS_SESSION_SECONDS = 8 * 60 * 60;

export function getAdminMetricsPassword(): string | null {
  const password = process.env.ADMIN_METRICS_PASSWORD;
  return password && password.length >= 12 ? password : null;
}

function signExpiry(expiry: string, password: string): string {
  return createHmac('sha256', password).update(expiry).digest('base64url');
}

export function createAdminMetricsSession(password: string, now = Date.now()): string {
  const expiry = String(Math.floor(now / 1000) + ADMIN_METRICS_SESSION_SECONDS);
  return `${expiry}.${signExpiry(expiry, password)}`;
}

export function isAdminMetricsSessionValid(
  session: string | undefined,
  password: string,
  now = Date.now(),
): boolean {
  if (!session) return false;
  const separator = session.indexOf('.');
  if (separator < 1) return false;
  const expiry = session.slice(0, separator);
  const signature = session.slice(separator + 1);
  if (!/^\d{10,}$/.test(expiry) || Number(expiry) <= Math.floor(now / 1000)) return false;

  const expected = Buffer.from(signExpiry(expiry, password));
  const actual = Buffer.from(signature);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export function passwordsMatch(candidate: string, expected: string): boolean {
  const candidateBytes = Buffer.from(candidate);
  const expectedBytes = Buffer.from(expected);
  return candidateBytes.length === expectedBytes.length && timingSafeEqual(candidateBytes, expectedBytes);
}
