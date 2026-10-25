import type { TryOnProvider, TryOnRequestInput } from '@/types/virtual-try-on';

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json() as unknown;
  } catch {
    throw new Error('Dịch vụ thử đồ trả về dữ liệu không hợp lệ.');
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

async function request(url: string, init: RequestInit): Promise<{ body: unknown; headers: Headers }> {
  let response: Response;
  try {
    response = await fetch(url, init);
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') throw error;
    throw new Error('Không thể kết nối đến dịch vụ thử đồ. Vui lòng kiểm tra mạng và thử lại.');
  }

  const body = await readJson(response);
  if (!response.ok) {
    const message = isRecord(body) && typeof body.error === 'string'
      ? body.error
      : 'Yêu cầu thử đồ chưa thành công. Vui lòng thử lại.';
    throw new Error(message);
  }
  return { body, headers: response.headers };
}

export async function startTryOn(
  input: TryOnRequestInput,
  signal: AbortSignal,
): Promise<{ image: string; provider: TryOnProvider }> {
  const formData = new FormData();
  formData.append('image', input.image);
  formData.append('productId', input.productId);
  formData.append('color', input.color);
  formData.append('size', input.size);

  const response = await request('/api/tryon', {
    method: 'POST',
    body: formData,
    signal,
  });
  const responseBody = response.body;
  if (
    !isRecord(responseBody)
    || typeof responseBody.image !== 'string'
    || !/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(responseBody.image)
  ) {
    throw new Error('Không nhận được ảnh kết quả từ dịch vụ thử đồ.');
  }
  const provider = response.headers.get('x-tryon-provider');
  if (provider !== 'gemini' && provider !== 'huggingface') {
    throw new Error('Không nhận được thông tin provider từ dịch vụ thử đồ.');
  }
  return { image: responseBody.image, provider };
}

export interface TryOnFeedbackInput {
  productId: string;
  color: string;
  provider: TryOnProvider;
  durationMs: number;
  rating: 'up' | 'down';
  reason?: 'áo méo' | 'sai màu' | 'mặt/tay lỗi' | 'khác';
}

export async function submitTryOnFeedback(input: TryOnFeedbackInput): Promise<void> {
  await request('/api/feedback', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
}
