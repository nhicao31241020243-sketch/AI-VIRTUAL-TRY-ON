'use client';

import { useRef, useState } from 'react';
import { Camera, Check, ImagePlus, Info, LockKeyhole, Sparkles, Upload, X } from 'lucide-react';
import { useVirtualTryOnMutation } from '@/hooks/useVirtualTryOnMutation';
import type { ProductColor, ProductSize, TryOnResponse } from '@/types/virtual-try-on';
import { cn } from '@/lib/utils';

const models = [
  { id: 'woman', label: 'Nữ mẫu', image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=240&q=80' },
  { id: 'man', label: 'Nam mẫu', image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=240&q=80' },
  { id: 'studio', label: 'Studio', image: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=240&q=80' },
];

interface TryOnModalProps {
  open: boolean;
  onClose: () => void;
  onComplete: (result: TryOnResponse) => void;
  color: ProductColor;
  size: ProductSize;
}

export function TryOnModal({ open, onClose, onComplete, color, size }: TryOnModalProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [modelId, setModelId] = useState<string>();
  const mutation = useVirtualTryOnMutation();

  if (!open) return null;

  const submit = () => mutation.mutate(
    { image: file, modelId, productId: 'linen-jacket-loose', color, size },
    { onSuccess: onComplete },
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="try-on-title">
      <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-3xl bg-cream shadow-2xl">
        <div className="flex items-center justify-between border-b border-ink/10 px-8 py-6">
          <div><p className="eyebrow">AI virtual try-on</p><h2 id="try-on-title" className="mt-2 font-display text-3xl font-bold">Mở phòng thử đồ</h2></div>
          <button onClick={onClose} className="rounded-full p-2 hover:bg-sand" aria-label="Đóng"><X /></button>
        </div>
        {mutation.isPending ? (
          <div className="flex min-h-[520px] flex-col items-center justify-center px-8 py-16 text-center">
            <div className="relative h-28 w-28"><div className="absolute inset-0 animate-spin-slow rounded-full border-4 border-sand border-t-moss" /><Sparkles className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-clay" size={30} /></div>
            <p className="eyebrow mt-9">Inference đang chạy</p><h3 className="mt-4 font-display text-3xl font-bold">AI đang lên đồ cho bạn</h3>
            <p className="mt-4 max-w-md leading-7 text-ink/60">IDM-VTON / VITON-HD đang kết hợp OpenPose để căn chỉnh phom áo tự nhiên nhất.</p>
            <div className="mt-8 h-2 w-full max-w-md overflow-hidden rounded-full bg-sand"><div className="h-full w-2/3 animate-pulse rounded-full bg-moss" /></div>
            <div className="mt-8 flex items-center gap-3 rounded-xl bg-clay/10 px-5 py-4 text-left"><LockKeyhole className="shrink-0 text-clay" size={20} /><p className="text-sm font-semibold">Ảnh của bạn chỉ được xử lý tạm thời trên RAM và tự động xóa sạch sau 5 phút.</p></div>
          </div>
        ) : (
          <div className="grid gap-6 p-8 lg:grid-cols-[1.25fr_0.75fr]">
            <div>
              <button onClick={() => inputRef.current?.click()} className="flex min-h-[360px] w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-moss/30 bg-white px-6 text-center transition hover:border-moss hover:bg-sand/20">
                <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(event) => { const selected = event.target.files?.[0]; if (selected) { setFile(selected); setModelId(undefined); } }} />
                {file ? <><Check size={44} className="rounded-full bg-moss p-2 text-white" /><p className="mt-4 font-semibold">{file.name}</p><p className="mt-2 text-sm text-ink/50">Nhấn để đổi ảnh</p></> : <><div className="rounded-full bg-sand p-4"><ImagePlus size={30} className="text-moss" /></div><p className="mt-5 text-lg font-bold">Kéo thả ảnh vào đây</p><p className="mt-2 text-sm text-ink/50">hoặc nhấn để chọn từ máy tính</p><span className="mt-6 inline-flex items-center gap-2 rounded-lg bg-cream px-4 py-3 text-sm font-semibold"><Upload size={16} /> Chọn ảnh</span></>}
              </button>
              <p className="mt-4 flex items-start gap-2 text-xs leading-5 text-ink/50"><Info size={15} className="mt-0.5 shrink-0" />JPG, PNG tối đa 10MB. Để kết quả tốt nhất, hãy dùng ảnh toàn thân đủ sáng.</p>
            </div>
            <div className="rounded-2xl border border-ink/10 bg-white p-6">
              <p className="font-bold">Hoặc chọn model mẫu</p><div className="mt-5 grid grid-cols-3 gap-2">{models.map((model) => <button key={model.id} onClick={() => { setModelId(model.id); setFile(null); }} className={cn('overflow-hidden rounded-xl border-2', modelId === model.id ? 'border-ink' : 'border-transparent')}><img src={model.image} alt={model.label} className="aspect-square w-full object-cover" /><span className="block py-2 text-xs font-semibold">{model.label}</span></button>)}</div>
              <div className="mt-7 space-y-4 border-t border-ink/10 pt-6"><div className="flex gap-3"><Camera className="text-moss" size={19} /><p className="text-sm leading-5">Đứng thẳng, nhìn trực diện và không bị che khuất.</p></div><div className="flex gap-3"><Sparkles className="text-moss" size={19} /><p className="text-sm leading-5">Mô hình Diffusion-based: IDM-VTON / VITON-HD + OpenPose.</p></div></div>
            </div>
            <div className="flex items-center justify-between border-t border-ink/10 pt-6 lg:col-span-2"><p className="max-w-md text-xs leading-5 text-ink/50">Bằng cách tiếp tục, bạn đồng ý với chính sách xử lý ảnh tạm thời của Áo Ảo Thật.</p><button onClick={submit} disabled={!file && !modelId} className="btn-primary disabled:cursor-not-allowed disabled:opacity-40"><Sparkles size={18} /> Bắt đầu thử đồ</button></div>
          </div>
        )}
      </div>
    </div>
  );
}
