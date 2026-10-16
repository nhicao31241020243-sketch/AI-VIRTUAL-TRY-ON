import type { TryOnRequest, TryOnResponse } from '@/types/virtual-try-on';
import { runVirtualTryOn } from '@/services/tryOnService';

export async function createVirtualTryOn(request: TryOnRequest): Promise<TryOnResponse> {
  if (!request.image && !request.modelId) {
    throw new Error('Vui lòng tải ảnh hoặc chọn model mẫu trước khi thử đồ.');
  }

  const personImage = request.image;
  if (!personImage) {
    throw new Error('Không tìm thấy ảnh người mẫu để thử đồ.');
  }
  const afterImageUrl = await runVirtualTryOn(personImage, request.garmentImage);

  return {
    id: `try-on-${Date.now()}`,
    beforeImageUrl:
      typeof personImage === 'string' ? personImage : URL.createObjectURL(personImage),
    afterImageUrl,
    status: 'completed',
  };
}
