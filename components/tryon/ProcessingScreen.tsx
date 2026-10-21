'use client';

import { useEffect, useState } from 'react';
import { LockKeyhole, Sparkles } from 'lucide-react';
import type { TryOnStatus } from '@/hooks/useTryOn';

interface ProcessingScreenProps {
  status: Extract<TryOnStatus, 'uploading' | 'processing'>;
  onCancel: () => void;
}

export function ProcessingScreen({ status, onCancel }: ProcessingScreenProps) {
  const [progress, setProgress] = useState(5);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setProgress((value) => Math.min(92, value + Math.max(1, (92 - value) / 12)));
    }, 700);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="flex min-h-[420px] flex-col items-center justify-center px-5 py-12 text-center sm:min-h-[500px] sm:px-8">
      <div className="relative h-24 w-24">
        <div className="absolute inset-0 animate-spin-slow rounded-full border-4 border-sand border-t-moss" />
        <Sparkles className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-clay" size={28} />
      </div>
      <p className="eyebrow mt-8">{status === 'uploading' ? 'Đang chuẩn bị ảnh' : 'Đang xử lý ảnh'}</p>
      <h3 className="mt-3 max-w-xl font-display text-2xl font-bold sm:text-3xl">
        {status === 'uploading' ? 'Đang tối ưu ảnh của bạn...' : 'AI đang phối đồ, vui lòng chờ trong giây lát...'}
      </h3>
      <p className="mt-3 max-w-md text-sm leading-6 text-ink/60">
        {status === 'uploading'
          ? 'Ảnh được nén trực tiếp trên thiết bị trước khi gửi đi.'
          : 'Quá trình tạo ảnh có thể mất đến 60 giây.'}
      </p>
      <div
        className="mt-7 h-2 w-full max-w-md overflow-hidden rounded-full bg-sand"
        role="progressbar"
        aria-label="Tiến trình thử đồ"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress)}
      >
        <div className="h-full rounded-full bg-moss transition-[width] duration-700" style={{ width: `${progress}%` }} />
      </div>
      <div className="mt-7 flex max-w-md items-center gap-3 rounded-xl bg-clay/10 px-4 py-3 text-left">
        <LockKeyhole className="shrink-0 text-clay" size={19} />
        <p className="text-xs leading-5 text-ink/75">Ảnh chỉ được xử lý tạm thời và tự động xóa sau 5 phút.</p>
      </div>
      <button type="button" onClick={onCancel} className="btn-secondary mt-7 py-3">Hủy</button>
    </div>
  );
}
