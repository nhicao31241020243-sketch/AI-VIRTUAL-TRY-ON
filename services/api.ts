import type { TryOnRequest, TryOnResponse } from '@/types/virtual-try-on';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

const wait = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));

export async function createVirtualTryOn(request: TryOnRequest): Promise<TryOnResponse> {
  if (!request.image && !request.modelId) {
    throw new Error('Vui lòng tải ảnh hoặc chọn model mẫu trước khi thử đồ.');
  }

  if (!API_URL) {
    await wait(3200);
    return {
      id: `demo-${Date.now()}`,
      beforeImageUrl: request.image ? URL.createObjectURL(request.image) : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=1400&q=85',
      afterImageUrl: 'https://images.unsplash.com/photo-1506629905607-d9c297d1b9a2?auto=format&fit=crop&w=1400&q=85',
      status: 'completed',
    };
  }

  const formData = new FormData();
  if (request.image) formData.append('image', request.image);
  if (request.modelId) formData.append('model_id', request.modelId);
  formData.append('product_id', request.productId);
  formData.append('color', request.color);
  formData.append('size', request.size);

  const response = await fetch(`${API_URL}/api/v1/virtual-try-on`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error('Không thể kết nối tới dịch vụ AI. Vui lòng thử lại sau.');
  }

  return response.json() as Promise<TryOnResponse>;
}
