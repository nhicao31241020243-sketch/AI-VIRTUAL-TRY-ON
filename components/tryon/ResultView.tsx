'use client';

import { useEffect, useRef, useState } from 'react';
import { Download, ShoppingBag, Sparkles } from 'lucide-react';
import { FeedbackWidget } from '@/components/FeedbackWidget';
import type { Product } from '@/types/product';
import type { TryOnProvider } from '@/types/virtual-try-on';


interface ResultViewProps {
  product: Product;
  color: string;
  size: string;
  beforeImageUrl: string;
  resultImageUrl: string;
  inferenceTimeMs: number | null;
  provider: TryOnProvider | null;
  onColorChange: (color: string) => void;
  onSizeChange: (size: string) => void;
  onRetry: () => void;
  onAddToCart: () => void;
  onBuyNow: () => void;
  fitAssessment: string;
  cartMessage: string | null;
}

export function ResultView({
  product,
  color,
  size,
  beforeImageUrl,
  resultImageUrl,
  inferenceTimeMs,
  provider,
  onColorChange,
  onSizeChange,
  onRetry,
  onAddToCart,
  onBuyNow,
  fitAssessment,
  cartMessage,
}: ResultViewProps) {
  const [position, setPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [stageWidth, setStageWidth] = useState(0);
  const stageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!stageRef.current) return;
    const observer = new ResizeObserver(([entry]) => setStageWidth(entry.contentRect.width));
    observer.observe(stageRef.current);
    return () => observer.disconnect();
  }, []);

  const updatePosition = (clientX: number) => {
    const bounds = stageRef.current?.getBoundingClientRect();
    if (!bounds) return;
    setPosition(Math.min(100, Math.max(0, ((clientX - bounds.left) / bounds.width) * 100)));
  };

  const download = async () => {
    setDownloadError(null);
    try {
      const response = await fetch(resultImageUrl);
      if (!response.ok) throw new Error('Không thể tải ảnh kết quả.');
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const extension = blob.type === 'image/png' ? 'png' : blob.type === 'image/webp' ? 'webp' : 'jpg';
      link.download = `${product.id}-thu-do-ai.${extension}`;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      setDownloadError('Không thể tải ảnh xuống. Vui lòng thử lại.');
    }
  };


  const elapsedLabel = inferenceTimeMs === null
    ? null
    : `Hoàn tất trong ${(inferenceTimeMs / 1000).toFixed(1)} giây`;

  return (
    <section className="container-wide py-10 lg:py-16">
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="eyebrow">Kết quả của bạn</p>
          <h1 className="mt-3 font-display text-3xl font-bold sm:text-4xl lg:text-5xl">Bạn trông thật tuyệt.</h1>
          <p className="mt-3 text-sm text-ink/60">{product.name} · Thử đồ AI</p>
          {elapsedLabel && <p className="mt-1 text-xs text-ink/45">{elapsedLabel}</p>}
        </div>
        <div className="flex flex-wrap gap-2 self-start sm:self-auto">
          <button type="button" onClick={onRetry} className="btn-secondary py-3">Thử lại</button>
          <a href="/products" className="btn-secondary py-3">Thử món khác</a>
        </div>
      </div>

      <div className="mt-8 grid gap-8 lg:mt-10 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div>
          <div
            ref={stageRef}
            className="relative aspect-[4/5] touch-pan-y overflow-hidden rounded-2xl bg-sand shadow-soft sm:aspect-[4/3]"
            onPointerMove={(event) => { if (isDragging) updatePosition(event.clientX); }}
            onPointerUp={() => setIsDragging(false)}
            onPointerCancel={() => setIsDragging(false)}
          >
            <img src={resultImageUrl} alt="Ảnh sau khi thử trang phục bằng AI" className="absolute inset-0 h-full w-full object-cover" />
            <div className="absolute inset-y-0 left-0 overflow-hidden" style={{ width: `${position}%` }}>
              <img src={beforeImageUrl} alt="Ảnh gốc trước khi thử trang phục" className="absolute inset-y-0 left-0 h-full max-w-none object-cover" style={{ width: stageWidth || '100%' }} />
            </div>
            <div
              className="absolute inset-y-0 z-10 flex w-0.5 -translate-x-1/2 touch-none items-center justify-center bg-white shadow-lg"
              style={{ left: `${position}%` }}
              onPointerDown={(event) => {
                event.currentTarget.setPointerCapture(event.pointerId);
                setIsDragging(true);
                updatePosition(event.clientX);
              }}
              onPointerMove={(event) => { if (isDragging) updatePosition(event.clientX); }}
              onPointerUp={() => setIsDragging(false)}
              role="slider"
              aria-label="Kéo để so sánh ảnh trước và sau"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(position)}
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key === 'ArrowLeft') setPosition((value) => Math.max(0, value - 5));
                if (event.key === 'ArrowRight') setPosition((value) => Math.min(100, value + 5));
              }}
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-xl text-ink shadow-lg" aria-hidden="true">↔</span>
            </div>
            <span className="absolute left-4 top-4 rounded-full bg-ink/80 px-3 py-1.5 text-xs font-bold text-white">TRƯỚC</span>
            <span className="absolute right-4 top-4 rounded-full bg-white/90 px-3 py-1.5 text-xs font-bold text-ink">SAU</span>
          </div>
          <p className="mt-3 text-xs leading-5 text-ink/55">
            Ảnh do AI tạo, chỉ mang tính tham khảo. Độ chính xác phụ thuộc góc chụp và chất lượng ảnh.
          </p>
          <label className="mt-4 block text-sm font-semibold">
            Điều chỉnh thanh trượt để so sánh
            <input
              aria-label="Thanh trượt so sánh ảnh trước và sau"
              type="range"
              min="0"
              max="100"
              value={position}
              onChange={(event) => setPosition(Number(event.target.value))}
              className="mt-3 block w-full cursor-ew-resize"
            />
          </label>
        </div>

        <aside className="h-fit rounded-2xl border border-ink/10 bg-white p-5 shadow-soft sm:p-6">
          <div className="flex items-center gap-2 text-sm font-bold"><Sparkles size={17} className="text-clay" />{product.name}</div>
          <p className="mt-5 text-xl font-bold">{product.price.toLocaleString('vi-VN')}đ</p>
          <p className="mt-4 rounded-xl bg-sand/55 px-3 py-2 text-xs leading-5 text-ink/75">{fitAssessment}</p>
          <label className="mt-5 block text-sm font-semibold">
            Màu sắc
            <select value={color} onChange={(event) => onColorChange(event.target.value)} className="mt-2 w-full rounded-lg border border-ink/15 bg-cream px-3 py-3 font-normal">
              {product.colors.map((item) => <option key={item.name} value={item.name}>{item.name}</option>)}
            </select>
          </label>
          <label className="mt-4 block text-sm font-semibold">
            Kích thước
            <select value={size} onChange={(event) => onSizeChange(event.target.value)} className="mt-2 w-full rounded-lg border border-ink/15 bg-cream px-3 py-3 font-normal">
              {product.sizes.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
          <div className="mt-5"><FeedbackWidget feature="tryon" title="Kết quả này hữu ích không?" /></div>
          <button type="button" data-analytics="download" data-analytics-feature="tryon" onClick={download} className="btn-secondary mt-5 w-full py-3"><Download size={17} /> Lưu ảnh</button>
          {downloadError && <p role="alert" className="mt-2 text-xs text-red-700">{downloadError}</p>}
          <button type="button" data-analytics="add-to-cart" data-analytics-feature="cart" onClick={onAddToCart} className="btn-secondary mt-3 w-full py-3"><ShoppingBag size={17} /> Thêm vào giỏ</button>
          <button type="button" data-analytics="add-to-cart" data-analytics-feature="cart" onClick={onBuyNow} className="btn-primary mt-3 w-full py-4"><ShoppingBag size={18} /> Mua ngay</button>
          <p className="mt-3 min-h-5 text-sm font-semibold text-moss" role="status">{cartMessage}</p>
        </aside>
      </div>
    </section>
  );
}
