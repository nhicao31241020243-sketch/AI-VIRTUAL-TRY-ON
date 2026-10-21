export type ProductCategory = 'upper_body' | 'lower_body' | 'dresses';

export interface ProductColorOption {
  name: string;
  hex: string;
  image: string;
  garmentImage: string;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  description: string;
  category: ProductCategory;
  colors: ProductColorOption[];
  sizes: string[];
  rating: number;
  reviews: number;
}
