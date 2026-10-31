import { NextRequest } from 'next/server';
import { identity, ipKey, json, limitedJson, sameOrigin } from '@/lib/analytics-http';
import { isClientEvent, record, SOURCES, type Source } from '@/lib/analytics-schema';
import { quality, saveEvents } from '@/lib/analytics-store';
import { createRateLimiter } from '@/lib/rate-limit';

export const runtime = 'nodejs';
const limiter = createRateLimiter({ requests: 120, windowMs: 60000 });
const clicks = createRateLimiter({ requests: 30, windowMs: 10000 });

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return json({ error: 'Nguồn yêu cầu không hợp lệ.' }, 403);
  try {
    const limit = await limiter.check(ipKey(request));
    if (!limit.allowed) {
      await quality('rate_limited');
      const response = json({ error: 'Quá nhiều yêu cầu.' }, 429);
      response.headers.set('Retry-After', String(limit.retryAfter));
      return response;
    }
    let input: unknown;
    try { input = await limitedJson(request); } catch { await quality('invalid'); return json({ error: 'Dữ liệu không hợp lệ hoặc quá lớn.' }, 400); }
    if (!record(input) || Object.keys(input).some(k => !['events', 'source'].includes(k)) || !Array.isArray(input.events) || input.events.length < 1 || input.events.length > 30 || !input.events.every(isClientEvent) || (input.source !== undefined && !SOURCES.includes(input.source as Source))) {
      await quality('invalid'); return json({ error: 'Sự kiện không hợp lệ.' }, 400);
    }
    const user = identity(request, input.events[0].page, input.source as Source);
    const at = new Date().toISOString();
    const events = [];
    for (const event of input.events) {
      const burst = event.kind === 'click' && !(await clicks.check(user.context.visitor)).allowed;
      events.push({ ...event, ...user.context, at, order: events.length, suspect: user.bot ? 'bot' as const : burst ? 'burst' as const : null });
    }
    const duplicates = await saveEvents(events);
    if (duplicates) await quality('duplicate_event', duplicates);
    return user.attach(json({ accepted: events.length - duplicates, duplicates }));
  } catch { return json({ error: 'Dịch vụ phân tích chưa sẵn sàng.' }, 503); }
}
