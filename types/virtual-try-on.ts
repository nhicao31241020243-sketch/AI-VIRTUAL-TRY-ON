export interface TryOnPredictionInput {
  humanImg: string;
  garmentImg: string;
  garmentDesc: string;
  category: import('@/types/product').ProductCategory;
}

export type TryOnPredictionStatus =
  | 'starting'
  | 'processing'
  | 'succeeded'
  | 'failed'
  | 'canceled';

export interface TryOnPredictionResult {
  status: TryOnPredictionStatus;
  output: string | null;
  error: string | null;
}
