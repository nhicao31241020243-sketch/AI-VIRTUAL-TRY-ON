import { NextResponse } from 'next/server';
import { createRateLimiter } from '@/lib/rate-limit';
import { createSupabaseAdminClient } from '@/lib/supabase-admin';
import { products } from '@/lib/products';
import type { TryOnProvider } from '@/types/virtual-try-on';

export const runtime = 'nodejs';

const MAX_BODY_BYTES = 4096;
const feedbackRateLimiter = createRateLimiter({ requests: 10, windowMs: 60 * 60_000 });
const PROVIDERS: TryOnProvider[] = ['gemini', 'huggingface'];
const REASONS = ['áo méo', 'sai màu', 'mặt/tay lỗi', 'khác'] as const;

function responseError(error: string, status: number) {
  return NextResponse.json({ error }, { status });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get('x-forwarded-for');
  const ip = forwardedFor?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')?.trim()
    || 'unknown';
  return ip.slice(0, 100);
}

async function readLimitedBody(request: Request): Promise<string | null> {
  if (!request.body) return null;
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    totalBytes += value.byteLength;
    if (totalBytes > MAX_BODY_BYTES) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks).toString('utf8');
}

export async function POST(request: Request) {
  const contentType = request.headers.get('content-type')?.split(';')[0].trim().toLowerCase();
  if (contentType !== 'application/json') {
    return responseError('Yêu cầu cần được gửi ở định dạng JSON.', 415);
  }

  const contentLength = Number(request.headers.get('content-length') ?? 0);
  if (contentLength > MAX_BODY_BYTES) {
    return responseError('Dữ liệu feedback vượt quá dung lượng cho phép.', 413);
  }

  const limit = await feedbackRateLimiter.check(getClientIp(request));
  if (!limit.allowed) {
    return NextResponse.json(
      { error: 'Bạn đã gửi quá nhiều đánh giá. Vui lòng thử lại sau.' },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfter) } },
    );
  }

  let input: unknown;
  try {
    const body = await readLimitedBody(request);
    if (body === null) return responseError('Dữ liệu feedback vượt quá dung lượng cho phép.', 413);
    input = JSON.parse(body) as unknown;
  } catch {
    return responseError('Dữ liệu feedback không hợp lệ.', 400);
  }

  if (!isRecord(input)) return responseError('Dữ liệu feedback không hợp lệ.', 400);
  const allowedFields = ['productId', 'color', 'provider', 'durationMs', 'rating', 'reason'];
  if (Object.keys(input).some((key) => !allowedFields.includes(key))) {
    return responseError('Feedback chỉ được chứa thông tin đánh giá, không gửi ảnh hoặc dữ liệu khác.', 400);
  }

  const { productId, color, provider, durationMs, rating, reason } = input;
  if (
    typeof productId !== 'string'
    || typeof color !== 'string'
    || typeof provider !== 'string'
    || !PROVIDERS.includes(provider as TryOnProvider)
    || typeof durationMs !== 'number'
    || !Number.isInteger(durationMs)
    || durationMs < 0
    || durationMs > 60_000
    || (rating !== 'up' && rating !== 'down')
  ) {
    return responseError('Thông tin feedback không hợp lệ.', 400);
  }

  if (rating === 'up' && reason !== undefined) {
    return responseError('Đánh giá 👍 không cần lý do.', 400);
  }
  if (rating === 'down' && !REASONS.includes(reason as typeof REASONS[number])) {
    return responseError('Vui lòng chọn lý do đánh giá 👎 hợp lệ.', 400);
  }

  const product = products.find((item) => item.id === productId);
  if (!product || !product.colors.some((item) => item.name === color)) {
    return responseError('Không tìm thấy sản phẩm hoặc màu sắc đã chọn.', 400);
  }

  try {
    const supabase = createSupabaseAdminClient();
    const { error } = await supabase.from('tryon_feedback').insert({
      product_id: productId,
      color,
      provider,
      duration_ms: durationMs,
      rating,
      reason: rating === 'down' ? reason : null,
    });
    if (error) {
      console.error('Không thể lưu feedback vào Supabase.', error.code);
      return responseError('Không thể lưu đánh giá lúc này. Vui lòng thử lại.', 503);
    }
  } catch {
    console.error('Không thể kết nối Supabase để lưu feedback.');
    return responseError('Dịch vụ lưu đánh giá chưa được cấu hình. Vui lòng thử lại sau.', 503);
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}
