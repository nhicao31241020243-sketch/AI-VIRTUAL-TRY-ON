import { readFile } from 'node:fs/promises';
import { resolve, sep } from 'node:path';
import { NextResponse } from 'next/server';
import { Client, handle_file } from '@gradio/client';
import sharp from 'sharp';
import { createRateLimiter } from '@/lib/rate-limit';
import { TRYON_CONFIG } from '@/lib/tryon-config';
import { products } from '@/lib/products';

export const runtime = 'nodejs';
export const maxDuration = 60;

const DATA_IMAGE_PATTERN = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$/;
const RATE_LIMIT_ENABLED = process.env.TRYON_RATE_LIMIT_ENABLED !== 'false';
const rateLimiter = createRateLimiter(TRYON_CONFIG.rateLimit);
const HUGGINGFACE_SPACE = 'yisol/IDM-VTON';
const HUGGINGFACE_SPACE_URL = 'https://yisol-idm-vton.hf.space';
const HUGGINGFACE_TIMEOUT_MS = 48_000;
const MAX_PROVIDER_IMAGE_BYTES = 20 * 1024 * 1024;
const GEMINI_MODEL = 'gemini-3.1-flash-image';
const GEMINI_PROMPT = 'Mặc chiếc áo trong ảnh thứ hai lên người trong ảnh thứ nhất. Giữ nguyên khuôn mặt, tư thế, dáng người, nền và ánh sáng. Áo vừa vặn tự nhiên, đúng màu và chi tiết.';

class RequestTooLargeError extends Error {}

function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isHuggingFaceToken(value: string): value is `hf_${string}` {
  return /^hf_[A-Za-z0-9]+$/.test(value);
}

async function readLimitedBody(request: Request): Promise<Buffer> {
  if (!request.body) return Buffer.alloc(0);

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
  return Buffer.concat(chunks);
}

function hasValidImageSignature(type: string, bytes: Buffer): boolean {
  if (type === 'image/jpeg') return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (type === 'image/png') {
    return bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  }
  return type === 'image/webp'
    && bytes.length >= 12
    && bytes.toString('ascii', 0, 4) === 'RIFF'
    && bytes.toString('ascii', 8, 12) === 'WEBP';
}

function toArrayBuffer(bytes: Buffer): ArrayBuffer {
  const arrayBuffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(arrayBuffer).set(bytes);
  return arrayBuffer;
}

function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get('x-forwarded-for');
  const ip = forwardedFor?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')?.trim()
    || 'unknown';
  return ip.slice(0, 100);
}

function getImageFromGemini(value: unknown): { mimeType: string; data: string } | null {
  if (!isRecord(value) || !Array.isArray(value.candidates)) return null;
  const candidate = value.candidates.find(isRecord);
  if (!candidate || !isRecord(candidate.content) || !Array.isArray(candidate.content.parts)) return null;
  const imagePart = candidate.content.parts.find((part) => (
    isRecord(part)
    && isRecord(part.inlineData)
    && typeof part.inlineData.mimeType === 'string'
    && typeof part.inlineData.data === 'string'
  ));
  if (!isRecord(imagePart) || !isRecord(imagePart.inlineData)) return null;
  return {
    mimeType: imagePart.inlineData.mimeType as string,
    data: imagePart.inlineData.data as string,
  };
}

function getHuggingFaceImageUrl(value: unknown): string | null {
  if (typeof value === 'string') {
    if (
      value.length <= Math.ceil(MAX_PROVIDER_IMAGE_BYTES * 4 / 3) + 40
      && /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(value)
    ) return value;
    try {
      const url = new URL(value, HUGGINGFACE_SPACE_URL);
      if (url.hostname !== 'yisol-idm-vton.hf.space') return null;
      if (value.startsWith('/file=') || value.startsWith('/gradio_api/file=')) return url.toString();
      if (/^https?:\/\//i.test(value)) return url.toString();
      const encodedPath = value.replace(/^\/+/, '').split('/').map(encodeURIComponent).join('/');
      return `${HUGGINGFACE_SPACE_URL}/file=${encodedPath}`;
    } catch {
      return null;
    }
  }

  if (!isRecord(value)) return null;
  if (typeof value.url === 'string') return getHuggingFaceImageUrl(value.url);
  if (typeof value.path === 'string') return getHuggingFaceImageUrl(value.path);
  if (typeof value.data === 'string') {
    if (
      value.data.length <= Math.ceil(MAX_PROVIDER_IMAGE_BYTES * 4 / 3) + 40
      && /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(value.data)
    ) {
      return value.data;
    }
    if (
      typeof value.mime_type === 'string'
      && ['image/jpeg', 'image/png', 'image/webp'].includes(value.mime_type)
      && /^[A-Za-z0-9+/]+={0,2}$/.test(value.data)
      && value.data.length <= Math.ceil(MAX_PROVIDER_IMAGE_BYTES * 4 / 3)
    ) {
      return `data:${value.mime_type};base64,${value.data}`;
    }
  }
  return null;
}

async function fetchHuggingFaceResultImage(imageReference: unknown): Promise<string> {
  const imageUrl = getHuggingFaceImageUrl(imageReference);
  if (!imageUrl) throw new Error('Hugging Face không trả về ảnh kết quả hợp lệ.');
  if (imageUrl.startsWith('data:')) return imageUrl;

  const response = await fetch(imageUrl, { signal: AbortSignal.timeout(8_000) });
  if (!response.ok) throw new Error('Không thể tải ảnh kết quả từ Hugging Face.');
  const outputBytes = Buffer.from(await response.arrayBuffer());
  if (outputBytes.length === 0 || outputBytes.length > MAX_PROVIDER_IMAGE_BYTES) {
    throw new Error('Ảnh kết quả từ Hugging Face không hợp lệ hoặc quá lớn.');
  }
  const outputImage = await sharp(outputBytes).jpeg({ quality: 90 }).toBuffer();
  return `data:image/jpeg;base64,${outputImage.toString('base64')}`;
}

async function runHuggingFaceTryOn(
  personBytes: Buffer,
  personMimeType: string,
  garmentBytes: Buffer,
  garmentDescription: string,
  token: `hf_${string}`,
): Promise<string> {
  let cancelJob: (() => Promise<void>) | null = null;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  const deadline = Date.now() + HUGGINGFACE_TIMEOUT_MS;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      if (cancelJob) void cancelJob().catch(() => undefined);
      reject(new Error('HUGGINGFACE_TIMEOUT'));
    }, HUGGINGFACE_TIMEOUT_MS);
  });

  const requestPromise = (async () => {
    const client = await Client.connect(HUGGINGFACE_SPACE, { token });
    if (Date.now() >= deadline) throw new Error('HUGGINGFACE_TIMEOUT');

    const humanImage = handle_file(new Blob([toArrayBuffer(personBytes)], { type: personMimeType }));
    const garmentImage = handle_file(new Blob([toArrayBuffer(garmentBytes)], { type: 'image/png' }));
    const job = client.submit('/tryon', [
      { background: humanImage, layers: [], composite: null },
      garmentImage,
      garmentDescription,
      true,
      false,
      30,
      Math.floor(Math.random() * 1_000_000),
    ]);
    cancelJob = () => job.cancel();

    for await (const event of job) {
      if (event.type === 'data' && Array.isArray(event.data)) {
        return fetchHuggingFaceResultImage(event.data[0]);
      }
    }
    throw new Error('Hugging Face kết thúc mà không trả về ảnh.');
  })();

  try {
    return await Promise.race([requestPromise, timeoutPromise]);
  } finally {
    if (timeoutId !== null) clearTimeout(timeoutId);
  }
}

function getHuggingFaceErrorResponse(error: unknown) {
  const details = error instanceof Error ? error.message.toLowerCase() : '';
  if (details.includes('huggingface_timeout')) {
    return errorResponse('Hugging Face đang xử lý hoặc xếp hàng quá lâu. Vui lòng thử lại sau.', 504);
  }
  if (/quota|daily limit|credits|zero.?gpu|gpu usage|too many requests|429/.test(details)) {
    return errorResponse('Hugging Face đã hết quota GPU hoặc đang giới hạn lượt dùng. Vui lòng thử lại sau.', 429);
  }
  if (/queue|queued|queue_full|capacity|busy/.test(details)) {
    return errorResponse('GPU Hugging Face đang bận và có nhiều lượt chờ. Vui lòng thử lại sau ít phút.', 503);
  }
  if (/unauthorized|forbidden|invalid token|authentication|401|403/.test(details)) {
    return errorResponse('Không thể xác thực Hugging Face. Vui lòng kiểm tra cấu hình HF_TOKEN.', 502);
  }
  return errorResponse('Space thử đồ Hugging Face đang gặp sự cố. Vui lòng thử lại sau.', 502);
}

export async function POST(request: Request) {
  if (RATE_LIMIT_ENABLED) {
    const rateLimit = await rateLimiter.check(getClientIp(request));
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Bạn đã thử quá nhiều lần. Vui lòng chờ một giờ rồi thử lại.' },
        { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfter) } },
      );
    }
  }

  const provider = process.env.TRYON_PROVIDER?.trim().toLowerCase() || 'gemini';
  if (provider !== 'gemini' && provider !== 'huggingface') {
    return errorResponse('TRYON_PROVIDER không hợp lệ. Hãy chọn gemini hoặc huggingface.', 500);
  }

  const geminiApiKey = process.env.GEMINI_API_KEY?.trim();
  const huggingFaceToken = process.env.HF_TOKEN?.trim();
  const validHuggingFaceToken = huggingFaceToken && isHuggingFaceToken(huggingFaceToken)
    ? huggingFaceToken
    : null;
  if (provider === 'gemini' && !geminiApiKey) {
    return errorResponse('Dịch vụ thử đồ chưa được cấu hình GEMINI_API_KEY. Vui lòng thử lại sau.', 500);
  }
  if (provider === 'huggingface' && !validHuggingFaceToken) {
    return errorResponse('Dịch vụ thử đồ chưa được cấu hình HF_TOKEN hợp lệ. Vui lòng thử lại sau.', 500);
  }

  const contentType = request.headers.get('content-type') ?? '';
  if (!contentType.toLowerCase().startsWith('multipart/form-data;')) {
    return errorResponse('Yêu cầu cần được gửi ở định dạng ảnh hợp lệ.', 415);
  }

  const contentLength = Number(request.headers.get('content-length') ?? 0);
  if (contentLength > TRYON_CONFIG.maxRequestBytes) {
    return errorResponse('Ảnh tải lên vượt quá dung lượng cho phép.', 413);
  }

  let formData: FormData;
  try {
    const rawBody = await readLimitedBody(request);
    const formRequest = new Request(request.url, {
      method: 'POST',
      headers: { 'content-type': contentType },
      body: new Uint8Array(rawBody),
    });
    formData = await formRequest.formData();
  } catch (error) {
    if (error instanceof RequestTooLargeError) {
      return errorResponse('Ảnh tải lên vượt quá dung lượng cho phép.', 413);
    }
    return errorResponse('Dữ liệu gửi lên không hợp lệ.', 400);
  }

  const personFile = formData.get('image');
  const productId = formData.get('productId');
  const color = formData.get('color');
  const size = formData.get('size');
  if (
    !(personFile instanceof File)
    || typeof productId !== 'string'
    || typeof color !== 'string'
    || typeof size !== 'string'
    || !['image/jpeg', 'image/png', 'image/webp'].includes(personFile.type)
  ) {
    return errorResponse('Vui lòng cung cấp ảnh JPG, PNG hoặc WebP cùng thông tin sản phẩm.', 400);
  }

  if (personFile.size === 0 || personFile.size > TRYON_CONFIG.maxImageBytes) {
    return errorResponse('Ảnh tải lên phải có dung lượng tối đa 4MB.', 413);
  }

  const personBytes = Buffer.from(await personFile.arrayBuffer());
  if (!hasValidImageSignature(personFile.type, personBytes)) {
    return errorResponse('Định dạng ảnh không hợp lệ. Vui lòng chọn ảnh JPG, PNG hoặc WebP.', 400);
  }

  const product = products.find((item) => item.id === productId);
  const colorOption = product?.colors.find((item) => item.name === color);
  if (!product || !colorOption || !product.sizes.includes(size)) {
    return errorResponse('Không tìm thấy sản phẩm, màu sắc hoặc kích thước đã chọn.', 400);
  }

  try {
    const publicDirectory = resolve(process.cwd(), 'public');
    const garmentPath = resolve(publicDirectory, colorOption.garmentImage.replace(/^\/+/, ''));
    if (!garmentPath.startsWith(`${publicDirectory}${sep}`)) {
      return errorResponse('Không thể tải ảnh sản phẩm đã chọn.', 500);
    }
    const garmentPipeline = sharp(await readFile(garmentPath));
    const garmentMetadata = await garmentPipeline.metadata();
    if (garmentMetadata.format === 'svg' && garmentMetadata.width && garmentMetadata.height > 0) {
      garmentPipeline.extract({
        left: 0,
        top: 0,
        width: garmentMetadata.width,
        height: Math.floor(garmentMetadata.height * 0.82),
      });
    }
    const garmentBytes = await garmentPipeline.png().toBuffer();

    if (provider === 'huggingface') {
      if (!validHuggingFaceToken) {
        return errorResponse('Dịch vụ thử đồ chưa được cấu hình HF_TOKEN hợp lệ. Vui lòng thử lại sau.', 500);
      }
      const image = await runHuggingFaceTryOn(
        personBytes,
        personFile.type,
        garmentBytes,
        `${product.name}, màu ${color}, kích thước ${size}.`,
        validHuggingFaceToken,
      );
      return NextResponse.json({ image });
    }

    if (!geminiApiKey) {
      return errorResponse('Dịch vụ thử đồ chưa được cấu hình GEMINI_API_KEY. Vui lòng thử lại sau.', 500);
    }
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': geminiApiKey,
        },
        body: JSON.stringify({
          contents: [{
            role: 'user',
            parts: [
              {
                inlineData: {
                  mimeType: personFile.type,
                  data: personBytes.toString('base64'),
                },
              },
              {
                inlineData: {
                  mimeType: 'image/png',
                  data: garmentBytes.toString('base64'),
                },
              },
              { text: GEMINI_PROMPT },
            ],
          }],
          generationConfig: { responseModalities: ['TEXT', 'IMAGE'] },
        }),
        signal: AbortSignal.timeout(55_000),
      },
    );

    if (!geminiResponse.ok) {
      return errorResponse(
        geminiResponse.status === 429
          ? 'Dịch vụ AI đang bận. Vui lòng thử lại sau ít phút.'
          : 'Gemini chưa thể tạo ảnh lúc này. Vui lòng thử lại sau.',
        geminiResponse.status === 429 ? 429 : 502,
      );
    }

    let geminiResult: unknown;
    try {
      geminiResult = await geminiResponse.json() as unknown;
    } catch {
      return errorResponse('Gemini trả về kết quả không hợp lệ. Vui lòng thử lại.', 502);
    }
    const image = getImageFromGemini(geminiResult);
    if (!image || !['image/jpeg', 'image/png', 'image/webp'].includes(image.mimeType)) {
      return errorResponse('Gemini chưa tạo được ảnh. Vui lòng thử lại với ảnh khác.', 502);
    }

    return NextResponse.json({ image: `data:${image.mimeType};base64,${image.data}` });
  } catch (error) {
    if (provider === 'huggingface') return getHuggingFaceErrorResponse(error);
    if (error instanceof Error && error.name === 'TimeoutError') {
      return errorResponse('Gemini xử lý quá lâu. Vui lòng thử lại.', 504);
    }
    return errorResponse('Không thể hoàn tất lượt thử đồ lúc này. Vui lòng thử lại sau.', 502);
  }
}
