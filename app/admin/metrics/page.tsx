import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { AnalyticsDashboard } from '@/components/AnalyticsDashboard';
import { ADMIN_METRICS_COOKIE, getAdminMetricsPassword, isAdminMetricsSessionValid } from '@/lib/admin-metrics-auth';
export const dynamic = 'force-dynamic';
export default async function MetricsPage() {
  const password = getAdminMetricsPassword();
  if (!password || !isAdminMetricsSessionValid((await cookies()).get(ADMIN_METRICS_COOKIE)?.value,password)) redirect('/admin/login');
  return <AnalyticsDashboard/>;
}
