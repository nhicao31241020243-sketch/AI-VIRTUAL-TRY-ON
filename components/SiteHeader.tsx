'use client';

import { Heart, ShoppingBag, Sparkles } from 'lucide-react';
import { useCart } from '@/components/CartProvider';

export function SiteHeader() {
  const { itemCount } = useCart();

  return (
    <header id="site-header" className="border-b border-ink/10 bg-cream/95 backdrop-blur">
      <div className="container-wide flex h-20 items-center justify-between sm:h-24">
        <a data-analytics="nav-home" data-analytics-feature="navigation" href="/" className="flex items-center gap-3" aria-label="Áo Ảo Thật - Trang chủ">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-ink text-white"><Sparkles size={21} /></span>
          <span>
            <span className="block font-display text-xl font-bold">Áo Ảo Thật</span>
            <span className="block text-[10px] font-bold uppercase tracking-[0.2em] text-moss">Thử đồ bằng AI</span>
          </span>
        </a>
        <nav className="hidden items-center gap-8 text-sm font-semibold md:flex" aria-label="Điều hướng chính">
          <a data-analytics="nav-home" data-analytics-feature="navigation" href="/" className="hover:text-moss">Sản phẩm nổi bật</a>
          <a data-analytics="nav-products" data-analytics-feature="navigation" href="/products" className="hover:text-moss">Danh sách sản phẩm</a>
          <a data-analytics="nav-privacy" data-analytics-feature="navigation" href="/privacy" className="hover:text-moss">Quyền riêng tư</a>
        </nav>
        <div className="flex items-center gap-1">
          <button type="button" className="rounded-full p-3 hover:bg-sand" aria-label="Sản phẩm yêu thích"><Heart size={19} /></button>
          <a data-analytics="nav-cart" data-analytics-feature="navigation" href="/cart" className="relative rounded-full p-3 hover:bg-sand" aria-label={`Giỏ hàng, ${itemCount} sản phẩm`}>
            <ShoppingBag size={19} />
            {itemCount > 0 && <span className="absolute right-1 top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-clay px-1 text-[10px] font-bold text-white">{itemCount}</span>}
          </a>
        </div>
      </div>
    </header>
  );
}
