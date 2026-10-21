import { NextResponse } from 'next/server';
import Replicate from 'replicate';
import type { ProductCategory } from '@/types/product';
import { TRYON_CONFIG } from '@/lib/tryon-config';

export const runtime = 'nodejs';

const DATA_IMAGE_PATTERN = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$/;
const CATEGORIES: ProductCategory[] = ['upper_body', 'lower_body', 'dresses'];
const rateLimitEntries = new Map<string, number[]>();
const demoPredictions = new Map<string, number>();
const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';
const DEMO_DELAY_MS = 3000;

interface TryOnInput {
  humanImg: string;
  garmentImg: string;
  garmentDesc: string;
  category: ProductCategory;
}

class RequestTooLargeError extends Error {}

function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

async function readLimitedBody(request: Request): Promise<string> {
  if (!request.body) return '';

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    totalBytes += value.byteLength;
    if (totalBytes > TRYON_CONFIG.maxRequestBytes) {
      await reader.cancel();
      throw new RequestTooLargeError();
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks).toString('utf8');
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isProductCategory(value: unknown): value is ProductCategory {
  return CATEGORIES.some((category) => category === value);
}

function isValidDataImage(value: string): boolean {
  const match = DATA_IMAGE_PATTERN.exec(value);
  if (!match) return false;

  const bytes = Buffer.from(match[2], 'base64');
  if (
    bytes.byteLength === 0
    || bytes.byteLength > TRYON_CONFIG.maxImageBytes
    || bytes.toString('base64') !== match[2]
  ) return false;
  if (match[2].length % 4 !== 0) return false;

  if (match[1] === 'jpeg') return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (match[1] === 'png') {
    return bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  }
  return bytes.length >= 12
    && bytes.toString('ascii', 0, 4) === 'RIFF'
    && bytes.toString('ascii', 8, 12) === 'WEBP';
}

function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get('x-forwarded-for');
  const ip = forwardedFor?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')?.trim()
    || 'unknown';
  return ip.slice(0, 100);
}

function checkRateLimit(request: Request): { allowed: true } | { allowed: false; retryAfter: number } {
  const now = Date.now();
  const cutoff = now - TRYON_CONFIG.rateLimit.windowMs;
  const ip = getClientIp(request);
  const recentRequests = (rateLimitEntries.get(ip) ?? []).filter((timestamp) => timestamp > cutoff);

  if (recentRequests.length >= TRYON_CONFIG.rateLimit.requests) {
    rateLimitEntries.set(ip, recentRequests);
    return {
      allowed: false,
      retryAfter: Math.max(1, Math.ceil((recentRequests[0] + TRYON_CONFIG.rateLimit.windowMs - now) / 1000)),
    };
  }

  recentRequests.push(now);
  rateLimitEntries.set(ip, recentRequests);
  if (rateLimitEntries.size > 1000) {
    for (const [key, timestamps] of rateLimitEntries) {
      if (timestamps.every((timestamp) => timestamp <= cutoff)) rateLimitEntries.delete(key);
    }
  }
  return { allowed: true };
}

function isTryOnInput(value: unknown): value is TryOnInput {
  if (!isRecord(value)) return false;
  const { humanImg, garmentImg, garmentDesc, category } = value;
  if (
    typeof humanImg !== 'string'
    || typeof garmentImg !== 'string'
    || typeof garmentDesc !== 'string'
    || garmentDesc.length < 1
    || garmentDesc.length > 250
    || !isProductCategory(category)
  ) return false;

  return isValidDataImage(humanImg) && isValidDataImage(garmentImg);
}

function getReplicate(): Replicate | null {
  const token = process.env.REPLICATE_API_TOKEN;
  return token?.trim() ? new Replicate({ auth: token }) : null;
}

export async function POST(request: Request) {
  const rateLimit = checkRateLimit(request);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'Bạn đã thử quá nhiều lần. Vui lòng chờ một phút rồi thử lại.' },
      { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfter) } },
    );
  }

  const replicate = getReplicate();
  if (!replicate && !DEMO_MODE) {
    return errorResponse('Dịch vụ thử đồ chưa được cấu hình. Vui lòng thử lại sau.', 500);
  }

  if (request.headers.get('content-type')?.split(';')[0] !== 'application/json') {
    return errorResponse('Yêu cầu cần được gửi ở định dạng JSON.', 415);
  }

  const contentLength = Number(request.headers.get('content-length') ?? 0);
  if (contentLength > TRYON_CONFIG.maxRequestBytes) {
    return errorResponse('Ảnh tải lên vượt quá dung lượng cho phép.', 413);
  }

  let body: unknown;
  try {
    const rawBody = await readLimitedBody(request);
    body = JSON.parse(rawBody) as unknown;
  } catch (error) {
    if (error instanceof RequestTooLargeError) {
      return errorResponse('Ảnh tải lên vượt quá dung lượng cho phép.', 413);
    }
    return errorResponse('Dữ liệu gửi lên không hợp lệ.', 400);
  }

  if (!isTryOnInput(body)) {
    return errorResponse('Vui lòng cung cấp ảnh hợp lệ (JPG, PNG hoặc WebP) và thông tin sản phẩm.', 400);
  }

  if (DEMO_MODE) {
    const id = `demo-${crypto.randomUUID()}`;
    demoPredictions.set(id, Date.now());
    return NextResponse.json({ id });
  }
  if (!replicate) {
    return errorResponse('Dịch vụ thử đồ chưa được cấu hình. Vui lòng thử lại sau.', 500);
  }

  try {
    const input = {
      [TRYON_CONFIG.inputFields.personImage]: body.humanImg,
      [TRYON_CONFIG.inputFields.garmentImage]: body.garmentImg,
      [TRYON_CONFIG.inputFields.garmentDescription]: body.garmentDesc,
      [TRYON_CONFIG.inputFields.category]: body.category,
    };
    const signal = AbortSignal.timeout(TRYON_CONFIG.timeoutMs);
    const prediction = TRYON_CONFIG.version
      ? await replicate.predictions.create({ version: TRYON_CONFIG.version, input, signal })
      : await replicate.predictions.create({ model: TRYON_CONFIG.model, input, signal });
    return NextResponse.json({ id: prediction.id });
  } catch {
    return errorResponse('Không thể bắt đầu thử đồ lúc này. Vui lòng thử lại sau.', 502);
  }
}

export async function GET(request: Request) {
  const replicate = getReplicate();
  if (!replicate && !DEMO_MODE) {
    return errorResponse('Dịch vụ thử đồ chưa được cấu hình. Vui lòng thử lại sau.', 500);
  }

  const id = new URL(request.url).searchParams.get('id');
  if (!id || !/^[a-z\d-]{1,100}$/i.test(id)) {
    return errorResponse('Mã lượt thử đồ không hợp lệ.', 400);
  }

  if (DEMO_MODE && id.startsWith('demo-')) {
    const startedAt = demoPredictions.get(id);
    if (!startedAt) return errorResponse('Không tìm thấy phiên demo thử đồ.', 404);
    const done = Date.now() - startedAt >= DEMO_DELAY_MS;
    if (done) {
      demoPredictions.delete(id);
      return NextResponse.json({
        status: 'succeeded',
        output: '/models/demo-result.svg',
        error: null,
      });
    }
    return NextResponse.json({ status: 'processing', output: null, error: null });
  }
  if (!replicate) {
    return errorResponse('Dịch vụ thử đồ chưa được cấu hình. Vui lòng thử lại sau.', 500);
  }

  try {
    const prediction = await replicate.predictions.get(id, { signal: AbortSignal.timeout(TRYON_CONFIG.timeoutMs) });
    const rawOutput: unknown = prediction.output;
    const output = typeof rawOutput === 'string'
      ? rawOutput
      : Array.isArray(rawOutput) && typeof rawOutput[0] === 'string'
        ? rawOutput[0]
        : null;
    const status = prediction.status;
    const error = status === 'failed' || status === 'canceled'
      ? 'AI chưa thể tạo kết quả. Vui lòng thử lại với ảnh khác.'
      : null;

    return NextResponse.json({ status, output, error });
  } catch {
    return errorResponse('Không thể kiểm tra tiến trình thử đồ. Vui lòng thử lại.', 502);
  }
}
