'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Check, ChevronLeft, ChevronRight, ShieldCheck, Sparkles, Star, Truck } from 'lucide-react';
import { useCart } from '@/components/CartProvider';
import { TryOnModal } from '@/components/tryon/TryOnModal';
import { ResultView } from '@/components/tryon/ResultView';
import { useTryOn } from '@/hooks/useTryOn';
import { getFitAssessment, type FitProfile } from '@/lib/fit';
import { recordMetric } from '@/lib/metrics';
import { products } from '@/lib/products';

function ProductPage() {
  const searchParams = useSearchParams();
  const productId = searchParams.get('product');
  const autoTryOn = searchParams.get('tryon') === '1';
  const product = useMemo(
    () => products.find((item) => item.id === productId) ?? products[0],
    [productId],
  );
  const [color, setColor] = useState(product.colors[0].name);
  const [size, setSize] = useState(product.sizes[1] ?? product.sizes[0]);
  const [gallery, setGallery] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [fitProfile, setFitProfile] = useState<FitProfile>({});
  const [cartMessage, setCartMessage] = useState<string | null>(null);
  const tryOn = useTryOn();
  const cart = useCart();

  useEffect(() => {
    setColor(product.colors[0].name);
    setSize(product.sizes[1] ?? product.sizes[0]);
    setGallery(0);
    setFitProfile({});
    setCartMessage(null);
    setModalOpen(autoTryOn);
    tryOn.reset();
  }, [autoTryOn, product.id, product.colors, product.sizes, tryOn.reset]);

  const selectedColor = product.colors.find((item) => item.name === color) ?? product.colors[0];
  const galleryImages = [selectedColor.image, selectedColor.garmentImage];
  const closeModal = useCallback(() => {
    setModalOpen(false);
    tryOn.reset();
  }, [tryOn]);
  const addToCart = useCallback(() => {
    cart.addItem(product, color, size);
    setCartMessage(`Đã thêm ${product.name} (${color}, ${size}) vào giỏ hàng.`);
  }, [cart, color, product, size]);

  const rerunTryOn = useCallback((nextColor: string, nextSize: string) => {
    setColor(nextColor);
    setSize(nextSize);
    const nextOption = product.colors.find((item) => item.name === nextColor);
    if (!nextOption || !tryOn.state.beforeImageUrl) return;
    setModalOpen(true);
    void tryOn.start(tryOn.state.beforeImageUrl, product, nextOption.garmentImage, nextColor, nextSize);
  }, [product, tryOn]);

  if (
    tryOn.state.status === 'success'
    && tryOn.state.beforeImageUrl
    && tryOn.state.resultImageUrl
  ) {
    return (
      <>
        <ResultView
          product={product}
          color={color}
          size={size}
          beforeImageUrl={tryOn.state.beforeImageUrl}
          resultImageUrl={tryOn.state.resultImageUrl}
          inferenceTimeMs={tryOn.state.inferenceTimeMs}
          fitAssessment={getFitAssessment(size, fitProfile)}
          onColorChange={(nextColor) => rerunTryOn(nextColor, size)}
          onSizeChange={(nextSize) => rerunTryOn(color, nextSize)}
          onRetry={() => { tryOn.reset(); setModalOpen(true); }}
          onAddToCart={addToCart}
          onBuyNow={addToCart}
          cartMessage={cartMessage}
        />
        <TryOnModal
          open={modalOpen && tryOn.state.status !== 'success'}
          product={product}
          garmentImage={selectedColor.garmentImage}
          color={color}
          size={size}
          state={tryOn.state}
          onClose={closeModal}
          onStart={(source, selectedProduct, garmentImage, selectedColorName, selectedSize, nextFitProfile) => {
            setFitProfile(nextFitProfile);
            void tryOn.start(source, selectedProduct, garmentImage, selectedColorName, selectedSize);
          }}
          onCancelProcessing={() => tryOn.reset()}
        />
      </>
    );
  }

  return (
    <>
      <main id="collection" className="container-wide py-8 sm:py-12 lg:py-16">
        <div className="mb-8 flex items-center gap-2 text-xs text-ink/45 sm:mb-10">
          <span>Trang chủ</span><ChevronRight size={14} /><span>Sản phẩm</span><ChevronRight size={14} />
          <span className="text-ink">{product.name}</span>
        </div>
        <div className="grid gap-9 lg:grid-cols-[minmax(0,1.3fr)_minmax(380px,0.7fr)] xl:gap-20">
          <div className="grid gap-3 sm:grid-cols-[84px_minmax(0,1fr)] lg:grid-cols-[100px_minmax(0,1fr)]">
            <div className="order-2 flex gap-3 sm:order-1 sm:flex-col">
              {galleryImages.map((image, index) => (
                <button
                  type="button"
                  key={`${image}-${index}`}
                  onClick={() => setGallery(index)}
                  aria-label={`Xem ảnh sản phẩm ${index + 1}`}
                  aria-pressed={gallery === index}
                  className={`aspect-[3/4] w-16 overflow-hidden rounded-xl border-2 sm:w-full ${gallery === index ? 'border-ink' : 'border-transparent opacity-60'}`}
                >
                  <img src={image} alt={`${product.name} - ảnh ${index + 1}`} className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
            <div className="group relative order-1 aspect-[4/5] overflow-hidden rounded-2xl bg-sand sm:order-2">
              <img src={galleryImages[gallery]} alt={product.name} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
              <span className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1 text-xs font-bold sm:left-5 sm:top-5">BÁN CHẠY</span>
              <div className="absolute bottom-4 right-4 flex gap-2 sm:bottom-5 sm:right-5">
                <button type="button" onClick={() => setGallery(Math.max(0, gallery - 1))} className="rounded-full bg-white p-2 shadow" aria-label="Ảnh trước"><ChevronLeft size={18} /></button>
                <button type="button" onClick={() => setGallery(Math.min(galleryImages.length - 1, gallery + 1))} className="rounded-full bg-white p-2 shadow" aria-label="Ảnh sau"><ChevronRight size={18} /></button>
              </div>
            </div>
          </div>

          <div className="flex flex-col justify-center">
            <p className="eyebrow">Áo Ảo Thật / Bộ sưu tập</p>
            <h1 className="mt-3 font-display text-3xl font-bold leading-tight sm:mt-4 sm:text-4xl lg:text-5xl">{product.name}</h1>
            <div className="mt-4 flex items-center gap-3">
              <span className="flex gap-0.5 text-clay">{[1, 2, 3, 4, 5].map((star) => <Star key={star} size={16} fill="currentColor" />)}</span>
              <span className="text-sm font-semibold">{product.rating} · {product.reviews} đánh giá</span>
            </div>
            <p className="mt-4 text-base leading-7 text-ink/60">{product.description}</p>
            <p className="mt-6 text-2xl font-bold">{product.price.toLocaleString('vi-VN')}đ</p>
            <div className="my-7 h-px bg-ink/10 sm:my-8" />

            <div>
              <div className="mb-3 flex justify-between text-sm font-semibold"><span>Màu sắc: {color}</span><span className="text-ink/45">{product.colors.length} màu</span></div>
              <div className="flex flex-wrap gap-2 sm:gap-3">
                {product.colors.map((item) => (
                  <button
                    type="button"
                    key={item.name}
                    onClick={() => { setColor(item.name); setGallery(0); }}
                    aria-pressed={color === item.name}
                    className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm sm:px-4 sm:py-3 ${color === item.name ? 'border-ink bg-white font-bold' : 'border-ink/10'}`}
                  >
                    <span className="h-4 w-4 rounded-full border border-black/10" style={{ backgroundColor: item.hex }} />{item.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-6 sm:mt-7">
              <div className="mb-3 flex justify-between text-sm font-semibold">
                <span>Kích thước: {size}</span><a href="#size-guide" className="font-normal text-ink/50 underline">Bảng size</a>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {product.sizes.map((item) => (
                  <button type="button" key={item} onClick={() => setSize(item)} aria-pressed={size === item} className={`rounded-lg border py-3 text-sm font-semibold ${size === item ? 'border-ink bg-ink text-white' : 'border-ink/15 bg-white hover:border-ink/40'}`}>{item}</button>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                recordMetric({ type: 'try_on_click', at: Date.now() });
                setModalOpen(true);
              }}
              className="btn-primary mt-7 w-full py-4 text-base sm:mt-8 sm:py-5"
            >
              <Sparkles size={19} /> Thử đồ bằng AI
            </button>
            {cartMessage && <p role="status" className="mt-3 text-sm font-semibold text-moss">{cartMessage}</p>}
            <div className="mt-7 grid gap-3 text-sm text-ink/65 sm:mt-8 sm:grid-cols-3 sm:gap-4">
              <div className="flex items-center gap-2"><ShieldCheck size={18} className="text-moss" />Đổi trả 30 ngày</div>
              <div className="flex items-center gap-2"><Truck size={18} className="text-moss" />Freeship từ 500k</div>
              <div className="flex items-center gap-2"><Check size={18} className="text-moss" />Chất liệu tự nhiên</div>
            </div>
          </div>
        </div>
        <div id="guide" className="sr-only">Tải ảnh toàn thân hoặc chọn người mẫu, sau đó bắt đầu thử đồ bằng AI.</div>
        <div id="size-guide" className="sr-only">Chọn kích thước S, M, L hoặc XL.</div>
      </main>
      <TryOnModal
        open={modalOpen}
        product={product}
        garmentImage={selectedColor.garmentImage}
        color={color}
        size={size}
        state={tryOn.state}
        onClose={closeModal}
        onStart={(source, selectedProduct, garmentImage, selectedColorName, selectedSize, nextFitProfile) => {
          setFitProfile(nextFitProfile);
          void tryOn.start(source, selectedProduct, garmentImage, selectedColorName, selectedSize);
        }}
        onCancelProcessing={() => tryOn.reset()}
      />
    </>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={<main className="container-wide py-12"><p className="text-sm text-ink/60">Đang tải sản phẩm...</p></main>}>
      <ProductPage />
    </Suspense>
  );
}
