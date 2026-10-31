import { createHash } from 'node:crypto';
import { NextRequest } from 'next/server';
import { identity, ipKey, json, limitedJson, sameOrigin } from '@/lib/analytics-http';
import { FEATURES, PAGES, REASONS, record, uuid, type Feature, type Page, type Feedback } from '@/lib/analytics-schema';
import { quality, readFeedback, saveFeedback } from '@/lib/analytics-store';
import { createRateLimiter } from '@/lib/rate-limit';

export const runtime = 'nodejs';
const limiter = createRateLimiter({ requests: 30, windowMs: 60000 });
const readLimiter = createRateLimiter({ requests: 60, windowMs: 60000 });
function feedbackId(visitor: string, page: string, feature: string) {
  const h = createHash('sha256').update(`${visitor}:${page}:${feature}`).digest('hex');
  return `${h.slice(0,8)}-${h.slice(8,12)}-4${h.slice(13,16)}-a${h.slice(17,20)}-${h.slice(20,32)}`;
}
export async function GET(request: NextRequest) {
  if (!sameOrigin(request)) return json({ error: 'Nguồn yêu cầu không hợp lệ.' }, 403);
  const page = request.nextUrl.searchParams.get('page') as Page;
  const feature = request.nextUrl.searchParams.get('feature') as Feature;
  if (!PAGES.includes(page) || !FEATURES.includes(feature)) return json({ error: 'Ngữ cảnh không hợp lệ.' }, 400);
  try {
    if (!(await readLimiter.check(ipKey(request))).allowed) return json({ error: 'Vui lòng chờ một phút rồi tải lại.' }, 429);
    const user = identity(request, page);
    const value = await readFeedback(feedbackId(user.context.visitor, page, feature));
    return user.attach(json({ feedback: value ? { rating: value.rating, reason: value.reason, comment: value.comment, revision: value.revision } : null }));
  } catch { return json({ error: 'Không thể tải đánh giá đã gửi.' }, 503); }
}
export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return json({ error: 'Nguồn yêu cầu không hợp lệ.' }, 403);
  try {
    const limit = await limiter.check(ipKey(request));
    if (!limit.allowed) { await quality('rate_limited'); const response = json({ error: 'Bạn gửi quá nhanh. Vui lòng chờ một phút.' }, 429); response.headers.set('Retry-After', String(limit.retryAfter)); return response; }
    let input: unknown;
    try { input = await limitedJson(request, 6000); } catch { await quality('invalid'); return json({ error: 'Dữ liệu không hợp lệ hoặc quá lớn.' }, 400); }
    if (!record(input) || Object.keys(input).some(k => !['requestId', 'revision', 'page', 'feature', 'rating', 'reason', 'comment'].includes(k)) || !uuid(input.requestId) || !Number.isInteger(input.revision) || Number(input.revision) < 0 || Number(input.revision) > 100000 || !PAGES.includes(input.page as Page) || !FEATURES.includes(input.feature as Feature) || !['up', 'down'].includes(String(input.rating)) || typeof input.comment !== 'string' || input.comment.length > 500 || (input.rating === 'down' ? !REASONS.includes(input.reason as typeof REASONS[number]) : input.reason !== null)) {
      await quality('invalid'); return json({ error: 'Chọn đánh giá, lý do hợp lệ và nhận xét tối đa 500 ký tự.' }, 400);
    }
    const user = identity(request, input.page as Page);
    const feedback: Feedback = { ...user.context, id: feedbackId(user.context.visitor, String(input.page), String(input.feature)), requestId: input.requestId, revision: Number(input.revision) + 1, at: new Date().toISOString(), page: input.page as Page, feature: input.feature as Feature, rating: input.rating as 'up' | 'down', reason: input.reason as Feedback['reason'], comment: input.comment.trim().replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, ''), suspect: user.bot ? 'bot' : null };
    const result = await saveFeedback(feedback, Number(input.revision));
    if (result === 'conflict') return user.attach(json({ error: 'Đánh giá đã thay đổi ở tab khác. Hãy tải lại đánh giá trước khi gửi.' }, 409));
    if (result === 'duplicate') await quality('duplicate_feedback');
    return user.attach(json({ ok: true, revision: feedback.revision }));
  } catch { return json({ error: 'Không thể lưu đánh giá. Vui lòng thử lại.' }, 503); }
}
