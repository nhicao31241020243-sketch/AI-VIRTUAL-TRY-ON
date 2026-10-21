import type { Metadata } from 'next';
import { QueryProvider } from '@/components/QueryProvider';
import { CartProvider } from '@/components/CartProvider';
import { SiteHeader } from '@/components/SiteHeader';
import { MetricsTracker } from '@/components/MetricsTracker';
import './globals.css';

export const metadata: Metadata = {
  title: 'Áo Ảo Thật — AI Virtual Try-On',
  description: 'Trải nghiệm thử đồ thời trang bằng AI.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="vi"><body><QueryProvider><CartProvider><MetricsTracker /><div className="min-h-screen bg-cream text-ink"><SiteHeader />{children}<footer id="about" className="mt-20 border-t border-ink/10 bg-white"><div className="container-wide flex flex-col justify-between gap-5 py-8 text-sm text-ink/60 md:flex-row"><p className="font-display text-xl font-bold text-ink">Áo Ảo Thật</p><p>© 2025 Áo Ảo Thật · Phòng thử đồ AI</p><p>Ảnh được xử lý tạm thời và tự động xóa sau 5 phút.</p></div></footer></div></CartProvider></QueryProvider></body></html>;
}
