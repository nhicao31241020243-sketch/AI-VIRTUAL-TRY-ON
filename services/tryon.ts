import type {
  TryOnPredictionInput,
  TryOnPredictionResult,
} from '@/types/virtual-try-on';

export class TryOnNetworkError extends Error {
  constructor() {
    super('Không thể kết nối đến dịch vụ thử đồ. Vui lòng kiểm tra mạng và thử lại.');
    this.name = 'TryOnNetworkError';
  }
}

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

async function request(url: string, init: RequestInit): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(url, init);
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') throw error;
    throw new TryOnNetworkError();
  }

  const body = await readJson(response);
  if (!response.ok) {
    const message = isRecord(body) && typeof body.error === 'string'
      ? body.error
      : 'Yêu cầu thử đồ chưa thành công. Vui lòng thử lại.';
    throw new Error(message);
  }
  return body;
}

export async function startTryOn(
  input: TryOnPredictionInput,
  signal: AbortSignal,
): Promise<string> {
  const body = await request('/api/tryon', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
    signal,
  });
  if (!isRecord(body) || typeof body.id !== 'string' || !body.id) {
    throw new Error('Không nhận được mã lượt thử đồ từ dịch vụ.');
  }
  return body.id;
}

export async function getTryOnStatus(
  id: string,
  signal: AbortSignal,
): Promise<TryOnPredictionResult> {
  const body = await request(`/api/tryon?id=${encodeURIComponent(id)}`, { signal });
  if (
    !isRecord(body)
    || typeof body.status !== 'string'
    || !['starting', 'processing', 'succeeded', 'failed', 'canceled'].includes(body.status)
    || (body.output !== null && typeof body.output !== 'string')
    || (body.error !== null && typeof body.error !== 'string')
  ) {
    throw new Error('Không thể đọc trạng thái lượt thử đồ.');
  }
  return {
    status: body.status as TryOnPredictionResult['status'],
    output: body.output,
    error: body.error,
  };
}
