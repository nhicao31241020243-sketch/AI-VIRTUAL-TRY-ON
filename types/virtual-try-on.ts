export type ProductColor = 'Beige' | 'Olive' | 'Black';
export type ProductSize = 'S' | 'M' | 'L' | 'XL';

export interface Product {
  id: string;
  name: string;
  price: number;
  description: string;
  images: string[];
}

export interface TryOnRequest {
  image: File | null;
  modelId?: string;
  productId: string;
  color: ProductColor;
  size: ProductSize;
}

export interface TryOnResponse {
  id: string;
  beforeImageUrl: string;
  afterImageUrl: string;
  status: 'completed';
}
