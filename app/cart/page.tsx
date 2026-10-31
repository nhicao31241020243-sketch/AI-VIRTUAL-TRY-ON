'use client';

import { Minus, Plus, Trash2 } from 'lucide-react';
import { useCart } from '@/components/CartProvider';

export default function CartPage() {
  const { items, totalPrice, updateQuantity, removeItem, clearCart } = useCart();

  return (
    <main className="container-wide py-8 sm:py-12 lg:py-16">
      <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">Giỏ hàng</p>
          <h1 className="mt-2 font-display text-3xl font-bold sm:text-4xl">Sản phẩm đã chọn</h1>
        </div>
        {items.length > 0 && (
          <button type="button" data-analytics="cart-remove" data-analytics-feature="cart" onClick={clearCart} className="btn-secondary py-3">Xóa toàn bộ</button>
        )}
      </div>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-ink/20 bg-white p-8 text-center">
          <p className="font-semibold">Giỏ hàng của bạn đang trống.</p>
          <p className="mt-2 text-sm text-ink/60">Hãy quay lại danh sách sản phẩm để thử và thêm vào giỏ.</p>
          <a href="/products" className="btn-primary mt-5 py-3">Khám phá sản phẩm</a>
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-3">
            {items.map((item) => (
              <article key={`${item.productId}-${item.color}-${item.size}`} className="rounded-2xl border border-ink/10 bg-white p-4 sm:p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="font-semibold">{item.name}</h2>
                    <p className="mt-1 text-sm text-ink/55">Màu {item.color} · Size {item.size}</p>
                    <p className="mt-1 text-sm font-semibold">{item.price.toLocaleString('vi-VN')}đ</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button type="button" data-analytics="cart-quantity" data-analytics-feature="cart" onClick={() => updateQuantity(item.productId, item.color, item.size, item.quantity - 1)} className="rounded-lg border border-ink/15 p-2" aria-label="Giảm số lượng"><Minus size={16} /></button>
                    <span className="w-8 text-center font-semibold">{item.quantity}</span>
                    <button type="button" data-analytics="cart-quantity" data-analytics-feature="cart" onClick={() => updateQuantity(item.productId, item.color, item.size, item.quantity + 1)} className="rounded-lg border border-ink/15 p-2" aria-label="Tăng số lượng"><Plus size={16} /></button>
                    <button type="button" data-analytics="cart-remove" data-analytics-feature="cart" onClick={() => removeItem(item.productId, item.color, item.size)} className="rounded-lg border border-ink/15 p-2 text-clay" aria-label="Xóa sản phẩm"><Trash2 size={16} /></button>
                  </div>
                </div>
              </article>
            ))}
          </div>
          <aside className="h-fit rounded-2xl border border-ink/10 bg-white p-5 shadow-soft sm:p-6">
            <p className="text-sm text-ink/55">Tạm tính</p>
            <p className="mt-2 font-display text-3xl font-bold">{totalPrice.toLocaleString('vi-VN')}đ</p>
            <button type="button" data-analytics="checkout-intent" data-analytics-feature="cart" className="btn-primary mt-5 w-full py-4">Tiến hành thanh toán</button>
            <p className="mt-3 text-xs text-ink/55">Giỏ hàng hiện đang lưu cục bộ trong trình duyệt (localStorage).</p>
          </aside>
        </div>
      )}
    </main>
  );
}
