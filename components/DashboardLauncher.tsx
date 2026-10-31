import Link from 'next/link';
import { ChartNoAxesCombined } from 'lucide-react';
export function DashboardLauncher() {
  return <Link href="/admin/metrics" className="dashboard-launcher btn-primary fixed z-40 gap-2 px-4 py-3 shadow-lg" aria-label="Mở Dashboard phân tích" title="Dashboard phân tích"><ChartNoAxesCombined size={20}/><span className="hidden sm:inline">Dashboard</span></Link>;
}
