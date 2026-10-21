'use client';

import { useEffect, useRef, useState } from 'react';
import { Camera, Check, ImagePlus, Info, Sparkles, Upload, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TryOnState } from '@/hooks/useTryOn';
import type { Product } from '@/types/product';
import { ProcessingScreen } from '@/components/tryon/ProcessingScreen';

const models = [
  { id: 'model-01', label: 'Mẫu 1', image: '/models/model-01.svg' },
  { id: 'model-02', label: 'Mẫu 2', image: '/models/model-02.svg' },
  { id: 'model-03', label: 'Mẫu 3', image: '/models/model-03.svg' },
  { id: 'model-04', label: 'Mẫu 4', image: '/models/model-04.svg' },
  { id: 'model-05', label: 'Mẫu 5', image: '/models/model-05.svg' },
];

interface TryOnModalProps {
  open: boolean;
  product: Product;
  garmentImage: string;
  color: string;
  size: string;
  state: TryOnState;
  onClose: () => void;
  onStart: (
    source: File | string,
    product: Product,
    garmentImage: string,
    color: string,
    size: string,
    fitProfile: { heightCm?: number; weightKg?: number },
  ) => void;
  onCancelProcessing: () => void;
}

export function TryOnModal({
  open,
  product,
  garmentImage,
  color,
  size,
  state,
  onClose,
  onStart,
  onCancelProcessing,
}: TryOnModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const selectionCleanupTimer = useRef<number | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [modelImage, setModelImage] = useState<string | null>(null);
  const [heightCm, setHeightCm] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const isProcessing = state.status === 'uploading' || state.status === 'processing';

  useEffect(() => {
    if (!open) {
      setFile(null);
      setModelImage(null);
      setHeightCm('');
      setWeightKg('');
      setPrivacyAccepted(false);
      setFileError(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (selectionCleanupTimer.current !== null) {
        window.clearTimeout(selectionCleanupTimer.current);
        selectionCleanupTimer.current = null;
      }
      return;
    }

    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialogRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== 'Tab' || !dialogRef.current) return;

      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(
        'button:not(:disabled), input:not(:disabled), [href], [tabindex]:not([tabindex="-1"])',
      )).filter((element) => element.offsetParent !== null);
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      previousFocus?.focus();
    };
  }, [open, onClose]);

  useEffect(() => {
    if (state.status === 'success') {
      setFile(null);
      setModelImage(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (selectionCleanupTimer.current !== null) {
        window.clearTimeout(selectionCleanupTimer.current);
        selectionCleanupTimer.current = null;
      }
    }
  }, [state.status]);

  useEffect(() => () => {
    if (selectionCleanupTimer.current !== null) {
      window.clearTimeout(selectionCleanupTimer.current);
    }
  }, []);

  if (!open) return null;

  const selectedSource = file ?? modelImage;
  const start = () => {
    const parsedHeight = Number(heightCm);
    const parsedWeight = Number(weightKg);
    const fitProfile = {
      heightCm: Number.isFinite(parsedHeight) && parsedHeight > 0 ? parsedHeight : undefined,
      weightKg: Number.isFinite(parsedWeight) && parsedWeight > 0 ? parsedWeight : undefined,
    };
    if (selectedSource) onStart(selectedSource, product, garmentImage, color, size, fitProfile);
  };
  const scheduleSelectionCleanup = () => {
    if (selectionCleanupTimer.current !== null) window.clearTimeout(selectionCleanupTimer.current);
    selectionCleanupTimer.current = window.setTimeout(() => {
      setFile(null);
      setModelImage(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      setFileError('Ảnh đã được xóa khỏi bộ nhớ tạm. Vui lòng chọn ảnh mới.');
    }, 5 * 60_000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 p-3 backdrop-blur-sm sm:p-5" role="presentation">
      <div
        ref={dialogRef}
        tabIndex={-1}
        className="max-h-[94vh] w-full max-w-4xl overflow-y-auto rounded-3xl bg-cream shadow-2xl outline-none"
        role="dialog"
        aria-modal="true"
        aria-labelledby="try-on-title"
      >
        <div className="flex items-center justify-between border-b border-ink/10 px-5 py-4 sm:px-8 sm:py-6">
          <div>
            <p className="eyebrow">Phòng thử đồ AI</p>
            <h2 id="try-on-title" className="mt-1 font-display text-2xl font-bold sm:mt-2 sm:text-3xl">Thử {product.name}</h2>
            <p className="mt-1 text-xs text-ink/55">Màu {color} · Kích thước {size}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-full p-2 hover:bg-sand" aria-label="Đóng cửa sổ thử đồ">
            <X />
          </button>
        </div>

        {isProcessing ? (
          <ProcessingScreen status={state.status === 'uploading' ? 'uploading' : 'processing'} onCancel={onCancelProcessing} />
        ) : (
          <div className="grid gap-5 p-5 sm:gap-6 sm:p-8 lg:grid-cols-[1.1fr_0.9fr]">
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(event) => {
                  const selected = event.target.files?.[0];
                  if (!selected) return;
                  if (!['image/jpeg', 'image/png', 'image/webp'].includes(selected.type)) {
                    setFileError('Vui lòng chọn ảnh JPG, PNG hoặc WebP.');
                    event.target.value = '';
                    return;
                  }
                  setFile(selected);
                  setModelImage(null);
                  setFileError(null);
                  scheduleSelectionCleanup();
                }}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex min-h-[260px] w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-moss/30 bg-white px-5 text-center transition hover:border-moss hover:bg-sand/20 sm:min-h-[340px]"
                aria-label="Chọn ảnh toàn thân từ thiết bị"
              >
                {file ? (
                  <>
                    <Check size={42} className="rounded-full bg-moss p-2 text-white" />
                    <p className="mt-4 max-w-full truncate font-semibold">{file.name}</p>
                    <p className="mt-2 text-sm text-ink/50">Nhấn để đổi ảnh</p>
                  </>
                ) : (
                  <>
                    <div className="rounded-full bg-sand p-4"><ImagePlus size={28} className="text-moss" /></div>
                    <p className="mt-4 text-lg font-bold">Tải ảnh toàn thân của bạn</p>
                    <p className="mt-2 text-sm text-ink/50">Đứng thẳng, nhìn trực diện và đủ sáng</p>
                    <span className="mt-5 inline-flex items-center gap-2 rounded-lg bg-cream px-4 py-3 text-sm font-semibold">
                      <Upload size={16} /> Chọn ảnh
                    </span>
                  </>
                )}
              </button>
              <p className="mt-3 flex items-start gap-2 text-xs leading-5 text-ink/50">
                <Info size={15} className="mt-0.5 shrink-0" /> JPG, PNG hoặc WebP, tối đa 20MB. Ảnh sẽ được nén còn khoảng 1MB trước khi gửi.
              </p>
            </div>

            <div className="rounded-2xl border border-ink/10 bg-white p-5 sm:p-6">
              <p className="font-bold">Hoặc chọn người mẫu</p>
              <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-3">
                {models.map((model) => (
                  <button
                    key={model.id}
                    type="button"
                    onClick={() => { setModelImage(model.image); setFile(null); setFileError(null); scheduleSelectionCleanup(); }}
                    aria-pressed={modelImage === model.image}
                    className={cn(
                      'overflow-hidden rounded-xl border-2',
                      modelImage === model.image ? 'border-ink' : 'border-transparent',
                    )}
                  >
                    <img src={model.image} alt={model.label} className="aspect-square w-full object-cover" />
                    <span className="block py-1.5 text-xs font-semibold">{model.label}</span>
                  </button>
                ))}
              </div>
              <div className="mt-5 space-y-3 border-t border-ink/10 pt-5">
                <div className="flex gap-3"><Camera className="shrink-0 text-moss" size={19} /><p className="text-sm leading-5">Đứng thẳng, nhìn trực diện và không bị che khuất.</p></div>
                <div className="flex gap-3"><Sparkles className="shrink-0 text-moss" size={19} /><p className="text-sm leading-5">Ảnh toàn thân giúp AI căn chỉnh trang phục tốt hơn.</p></div>
              </div>
            </div>

            <div className="border-t border-ink/10 pt-5 lg:col-span-2">
              <div className="mb-4 grid gap-3 sm:grid-cols-2">
                <label className="text-sm font-semibold">
                  Chiều cao (cm, tùy chọn)
                  <input
                    type="number"
                    min={120}
                    max={220}
                    value={heightCm}
                    onChange={(event) => setHeightCm(event.target.value)}
                    className="mt-2 w-full rounded-lg border border-ink/15 bg-white px-3 py-3 text-sm font-normal"
                    placeholder="Ví dụ: 165"
                  />
                </label>
                <label className="text-sm font-semibold">
                  Cân nặng (kg, tùy chọn)
                  <input
                    type="number"
                    min={30}
                    max={180}
                    value={weightKg}
                    onChange={(event) => setWeightKg(event.target.value)}
                    className="mt-2 w-full rounded-lg border border-ink/15 bg-white px-3 py-3 text-sm font-normal"
                    placeholder="Ví dụ: 54"
                  />
                </label>
              </div>
              <p className="mb-4 text-xs leading-5 text-ink/55">Ảnh chỉ được xử lý tạm thời và tự động xóa sau 5 phút.</p>
              <label className="mb-4 flex items-start gap-2 text-xs leading-5 text-ink/65">
                <input
                  type="checkbox"
                  checked={privacyAccepted}
                  onChange={(event) => setPrivacyAccepted(event.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-ink/20 accent-ink"
                  aria-label="Tôi đồng ý chính sách quyền riêng tư"
                />
                Tôi đồng ý cho gửi ảnh đến dịch vụ AI để xử lý tạm thời và tự động xóa sau 5 phút.
              </label>
              {fileError && <p role="alert" className="mb-3 text-sm text-red-700">{fileError}</p>}
              {state.status === 'error' && (
                <div className="mb-4 flex flex-col gap-3 rounded-xl border border-clay/20 bg-clay/5 p-4 sm:flex-row sm:items-center">
                  <img src="/models/model-01.svg" alt="Ảnh người mẫu minh họa" className="h-20 w-16 rounded-lg object-cover" />
                  <div className="flex-1">
                    <p role="alert" className="text-sm font-semibold text-ink">{state.error}</p>
                    <p className="mt-1 text-xs text-ink/55">Bạn có thể thử lại hoặc chọn một ảnh khác.</p>
                  </div>
                  <button type="button" onClick={start} disabled={!selectedSource || !privacyAccepted} className="btn-secondary py-2.5 disabled:opacity-40">Thử lại</button>
                </div>
              )}
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs leading-5 text-ink/50">Ảnh được nén trên thiết bị và chỉ gửi để tạo kết quả thử đồ.</p>
                <button
                  type="button"
                  onClick={() => {
                    if (!selectedSource) {
                      setFileError('Vui lòng tải ảnh lên hoặc chọn người mẫu trước khi bắt đầu.');
                      return;
                    }
                    if (!privacyAccepted) {
                      setFileError('Vui lòng đồng ý chính sách quyền riêng tư trước khi bắt đầu.');
                      return;
                    }
                    start();
                  }}
                  disabled={!selectedSource || !privacyAccepted}
                  className="btn-primary w-full py-4 disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
                >
                  <Sparkles size={18} /> Bắt đầu thử đồ AI
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
