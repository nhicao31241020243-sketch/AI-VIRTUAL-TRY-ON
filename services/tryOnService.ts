import type { TryOnServiceResponse } from '@/types/virtual-try-on';

const AI_API_URL = process.env.NEXT_PUBLIC_AI_API_URL || 'https://api-example.com/vton';
const MOCK_RESULT_IMAGE_URL =
  'https://images.unsplash.com/photo-1506629905607-d9c297d1b9a2?auto=format&fit=crop&w=1400&q=85';

const wait = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function getMockResult(): Promise<string> {
  await wait(3000);
  return MOCK_RESULT_IMAGE_URL;
}

export async function runVirtualTryOn(
  personImage: File | string,
  garmentImage: string,
): Promise<string> {
  if (!process.env.NEXT_PUBLIC_AI_API_URL) {
    return getMockResult();
  }

  try {
    const formData = new FormData();
    formData.append('person_image', personImage);
    formData.append('garment_image', garmentImage);

    const response = await fetch(AI_API_URL, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`AI service returned HTTP ${response.status}`);
    }

    const result: TryOnServiceResponse = await response.json();
    if (typeof result.result_image_url !== 'string' || !result.result_image_url) {
      throw new Error('AI service response is missing result_image_url');
    }

    return result.result_image_url;
  } catch (error) {
    console.warn('Virtual try-on request failed; using the demo result instead.', error);
    return getMockResult();
  }
}
