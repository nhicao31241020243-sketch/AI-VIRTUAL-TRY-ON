'use client';

import { useState } from 'react';
import { Download, Share2, ShoppingBag, Sparkles } from 'lucide-react';
import type { TryOnResponse } from '@/types/virtual-try-on';

export function ResultView({ result, onRetry }: { result: TryOnResponse; onRetry: () => void }) {
  const [position, setPosition] = useState(54);
  const [shared, setShared] = useState(false);
  const download = () => { const link = document.createElement('a'); link.href = result.afterImageUrl; link.download = 'ao-ao-that-result.jpg'; link.click(); };
  const share = async () => { if (navigator.share) await navigator.share({ title: 'Kết quả thử đồ AI', url: window.location.href }); else { await navigator.clipboard.writeText(window.location.href); setShared(true); } };

  return <section className="container-wide py-12 lg:py-16"><div className="flex flex-col justify-between gap-5 md:flex-row md:items-end"><div><p className="eyebrow">Kết quả của bạn</p><h1 className="mt-3 font-display text-4xl font-bold lg:text-5xl">Bạn trông thật tuyệt.</h1><p className="mt-3 text-ink/60">Linen Jacket Form Loose · AI Fit</p></div><button onClick={onRetry} className="btn-secondary self-start py-3 md:self-auto">Thử lại với ảnh khác</button></div>
    <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px]"><div><div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-sand shadow-soft"><img src={result.afterImageUrl} alt="Kết quả AI sau khi thử áo" className="absolute inset-0 h-full w-full object-cover" /><div className="absolute inset-y-0 left-0 overflow-hidden" style={{ width: `${position}%` }}><img src={result.beforeImageUrl} alt="Ảnh gốc trước khi thử áo" className="h-full w-[calc(100vw-3rem)] max-w-none object-cover lg:w-[calc((100vw-6rem)*0.66)]" /></div><div className="absolute inset-y-0 flex w-0.5 items-center bg-white shadow-lg" style={{ left: `${position}%` }}><div className="flex h-10 w-10 -translate-x-1/2 items-center justify-center rounded-full bg-white text-ink shadow-lg">↔</div></div><span className="absolute left-5 top-5 rounded-full bg-ink/80 px-3 py-1.5 text-xs font-bold text-white">BEFORE</span><span className="absolute right-5 top-5 rounded-full bg-white/90 px-3 py-1.5 text-xs font-bold">AFTER</span></div><label className="mt-5 block text-sm font-semibold">Kéo thanh trượt để so sánh<input aria-label="Thanh trượt so sánh ảnh" type="range" min="0" max="100" value={position} onChange={(event) => setPosition(Number(event.target.value))} className="mt-3 block w-full cursor-ew-resize" /></label></div>
      <aside className="rounded-2xl border border-ink/10 bg-white p-6 shadow-soft"><div className="flex items-center gap-2 text-sm font-bold"><Sparkles size={17} className="text-clay" />Linen Jacket Form Loose</div><p className="mt-6 text-sm font-semibold">Kết quả AI đã sẵn sàng</p><button onClick={download} className="btn-secondary mt-6 w-full py-3"><Download size={17} /> Tải ảnh kết quả</button><button onClick={share} className="btn-secondary mt-3 w-full py-3"><Share2 size={17} /> {shared ? 'Đã sao chép liên kết' : 'Chia sẻ kết quả'}</button><button className="btn-primary mt-3 w-full py-4"><ShoppingBag size={18} /> Thêm vào giỏ & Mua ngay</button></aside>
    </div></section>;
}
