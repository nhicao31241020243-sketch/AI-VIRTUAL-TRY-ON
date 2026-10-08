import type { Metadata } from 'next';
import { Heart, ShoppingBag, Sparkles } from 'lucide-react';
import { QueryProvider } from '@/components/QueryProvider';
import './globals.css';

export const metadata: Metadata = {
  title: 'Áo Ảo Thật — AI Virtual Try-On',
  description: 'Trải nghiệm thử đồ thời trang bằng AI.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="vi"><body><QueryProvider><div className="min-h-screen bg-cream text-ink"><header className="border-b border-ink/10 bg-cream/95 backdrop-blur"><div className="container-wide flex h-24 items-center justify-between"><a href="/" className="flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-ink text-white"><Sparkles size={21} /></span><span><span className="block font-display text-xl font-bold">Áo Ảo Thật</span><span className="block text-[10px] font-bold uppercase tracking-[0.2em] text-moss">AI virtual try-on</span></span></a><nav className="hidden items-center gap-8 text-sm font-semibold md:flex"><a href="#collection" className="hover:text-moss">Bộ sưu tập</a><a href="#guide" className="hover:text-moss">Cách hoạt động</a><a href="#about" className="hover:text-moss">Về chúng tôi</a></nav><div className="flex items-center gap-2"><button className="rounded-full p-3 hover:bg-sand" aria-label="Sản phẩm yêu thích"><Heart size={19} /></button><button className="rounded-full p-3 hover:bg-sand" aria-label="Giỏ hàng"><ShoppingBag size={19} /></button></div></div></header>{children}<footer id="about" className="mt-20 border-t border-ink/10 bg-white"><div className="container-wide flex flex-col justify-between gap-5 py-8 text-sm text-ink/60 md:flex-row"><p className="font-display text-xl font-bold text-ink">Áo Ảo Thật</p><p>© 2025 Áo Ảo Thật · AI-powered fitting room</p><p>Ảnh xử lý tạm thời trên RAM, tự động xóa sau 5 phút.</p></div></footer></div></QueryProvider></body></html>;
}
