export interface TryOnRequestInput {
  image: File;
  productId: string;
  color: string;
  size: string;
}

export type TryOnProvider = 'gemini' | 'huggingface';
