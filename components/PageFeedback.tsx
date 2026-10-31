'use client';
import { usePathname } from 'next/navigation';
import { FeedbackWidget } from './FeedbackWidget';
import { PAGES, type Page } from '@/lib/analytics-schema';
export function PageFeedback() {
  const page = usePathname();
  if (!PAGES.includes(page as Page)) return null;
  return <div className="container-wide my-10"><div className="max-w-2xl"><FeedbackWidget key={page}/></div></div>;
}
