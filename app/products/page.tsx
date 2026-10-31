'use client';

import { useMemo, useState } from 'react';
import { Sparkles, Star } from 'lucide-react';
import { recordMetric } from '@/lib/metrics';
import { products } from '@/lib/products';
import type { ProductCategory } from '@/types/product';

type ProductFilter = 'all' | ProductCategory;

const FILTERS: Array<{ value: ProductFilter; label: string }> = [
  { value: 'all', label: 'Tất cả' },
  { value: 'upper_body', label: 'Áo' },
  { value: 'lower_body', label: 'Quần' },
  { value: 'dresses', label: 'Váy' },
];

export default function ProductsPage() {
  const [filter, setFilter] = useState<ProductFilter>('all');
  const filteredProducts = useMemo(
    () => (filter === 'all' ? products : products.filter((item) => item.category === filter)),
    [filter],
  );

  return (
    <main className="container-wide py-8 sm:py-12 lg:py-16">
      <div className="mb-7 sm:mb-9">
        <p className="eyebrow">Danh sách sản phẩm</p>
        <h1 className="mt-3 font-display text-3xl font-bold sm:text-4xl">Khám phá bộ sưu tập Áo Ảo Thật</h1>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {FILTERS.map((item) => (
          <button
            key={item.value}
            type="button"
            data-analytics="catalog-filter" data-analytics-feature="catalog" onClick={() => setFilter(item.value)}
            aria-pressed={filter === item.value}
            className={`rounded-full border px-4 py-2 text-sm font-semibold ${filter === item.value ? 'border-ink bg-ink text-white' : 'border-ink/15 bg-white text-ink'}`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {filteredProducts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-ink/20 bg-white p-8 text-center">
          <p className="font-semibold">Không có sản phẩm phù hợp bộ lọc này.</p>
          <p className="mt-2 text-sm text-ink/60">Vui lòng thử bộ lọc khác.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredProducts.map((product) => {
            const image = product.colors[0]?.image ?? '/products/upper-body-placeholder.svg';
            return (
              <article key={product.id} className="overflow-hidden rounded-2xl border border-ink/10 bg-white shadow-soft">
                <img src={image} alt={product.name} className="aspect-[4/5] w-full object-cover" />
                <div className="p-4">
                  <h2 className="font-semibold">{product.name}</h2>
                  <p className="mt-1 text-sm text-ink/55">{product.price.toLocaleString('vi-VN')}đ</p>
                  <div className="mt-2 flex items-center gap-2 text-xs text-ink/60">
                    <span className="inline-flex items-center gap-1 text-clay"><Star size={12} fill="currentColor" />{product.rating}</span>
                    <span>{product.reviews} đánh giá</span>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <a data-analytics="catalog-view" data-analytics-feature="catalog" href={`/?product=${product.id}`} className="btn-secondary justify-center px-3 py-2 text-sm">Xem</a>
                    <a
                      data-analytics="catalog-tryon" data-analytics-feature="tryon" href={`/?product=${product.id}&tryon=1`}
                      className="btn-primary justify-center px-3 py-2 text-sm"
                      onClick={() => recordMetric({ type: 'try_on_click', at: Date.now() })}
                    >
                      <Sparkles size={14} /> Thử nhanh
                    </a>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </main>
  );
}
