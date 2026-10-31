import type { Metadata } from 'next';
import { QueryProvider } from '@/components/QueryProvider';
import { CartProvider } from '@/components/CartProvider';
import { SiteHeader } from '@/components/SiteHeader';
import { MetricsTracker } from '@/components/MetricsTracker';
import { DashboardLauncher } from '@/components/DashboardLauncher';
import { PageFeedback } from '@/components/PageFeedback';
import { AnalyticsPreference } from '@/components/AnalyticsPreference';
import './globals.css';

export const metadata: Metadata = {
  title: 'Áo Ảo Thật — AI Virtual Try-On',
  description: 'Trải nghiệm thử đồ thời trang bằng AI.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="vi"><body><QueryProvider><CartProvider><MetricsTracker /><div className="min-h-screen bg-cream pb-20 text-ink"><SiteHeader />{children}<PageFeedback /><DashboardLauncher /><footer id="about" className="mt-20 border-t border-ink/10 bg-white"><div className="container-wide py-8 text-sm text-ink/60"><div className="flex flex-col justify-between gap-5 md:flex-row"><p className="font-display text-xl font-bold text-ink">Áo Ảo Thật</p><p>© 2025 Áo Ảo Thật · Phòng thử đồ AI</p><p>Ảnh được gửi đến provider AI để xử lý thử đồ.</p></div><AnalyticsPreference /></div></footer></div></CartProvider></QueryProvider></body></html>;
}
