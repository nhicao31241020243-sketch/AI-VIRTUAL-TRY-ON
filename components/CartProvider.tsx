'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { Product } from '@/types/product';
import { track } from '@/lib/analytics-client';

export interface CartItem {
  productId: string;
  name: string;
  price: number;
  color: string;
  size: string;
  quantity: number;
}

interface CartContextValue {
  items: CartItem[];
  itemCount: number;
  totalPrice: number;
  addItem: (product: Product, color: string, size: string) => void;
  updateQuantity: (productId: string, color: string, size: string, quantity: number) => void;
  removeItem: (productId: string, color: string, size: string) => void;
  clearCart: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);
const STORAGE_KEY = 'aoao.cart.v1';

function isCartItem(value: unknown): value is CartItem {
  if (typeof value !== 'object' || value === null) return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.productId === 'string'
    && typeof item.name === 'string'
    && typeof item.price === 'number'
    && Number.isFinite(item.price)
    && typeof item.color === 'string'
    && typeof item.size === 'string'
    && typeof item.quantity === 'number'
    && Number.isSafeInteger(item.quantity)
    && item.quantity > 0
  );
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed: unknown = JSON.parse(raw);
        if (Array.isArray(parsed)) setItems(parsed.filter(isCartItem));
      }
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('Không thể đọc dữ liệu giỏ hàng từ localStorage.', error);
      }
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('Không thể lưu dữ liệu giỏ hàng vào localStorage.', error);
      }
    }
  }, [hydrated, items]);

  const addItem = useCallback((product: Product, color: string, size: string) => {
    track('conversion', 'cart', 'add-to-cart');
    setItems((current) => {
      const existing = current.find((item) => item.productId === product.id && item.color === color && item.size === size);
      if (existing) {
        return current.map((item) => item === existing ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...current, {
        productId: product.id,
        name: product.name,
        price: product.price,
        color,
        size,
        quantity: 1,
      }];
    });
  }, []);

  const updateQuantity = useCallback((productId: string, color: string, size: string, quantity: number) => {
    setItems((current) => {
      if (quantity <= 0) {
        return current.filter((item) => !(item.productId === productId && item.color === color && item.size === size));
      }
      return current.map((item) => (
        item.productId === productId && item.color === color && item.size === size
          ? { ...item, quantity: Math.max(1, quantity) }
          : item
      ));
    });
  }, []);

  const removeItem = useCallback((productId: string, color: string, size: string) => {
    setItems((current) => current.filter((item) => !(item.productId === productId && item.color === color && item.size === size)));
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const value = useMemo(() => {
    const itemCount = items.reduce((total, item) => total + item.quantity, 0);
    const totalPrice = items.reduce((total, item) => total + (item.price * item.quantity), 0);
    return { items, itemCount, totalPrice, addItem, updateQuantity, removeItem, clearCart };
  }, [items, addItem, updateQuantity, removeItem, clearCart]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart phải được gọi bên trong CartProvider.');
  return context;
}
