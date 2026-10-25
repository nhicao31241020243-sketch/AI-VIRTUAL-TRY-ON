import 'server-only';

import { createSupabaseAdminClient } from '@/lib/supabase-admin';
import type { TryOnProvider } from '@/types/virtual-try-on';

interface TryOnMetric {
  productId: string;
  color: string;
  provider: TryOnProvider;
  outcome: 'success' | 'error';
  durationMs: number;
}

export async function recordTryOnMetric(metric: TryOnMetric): Promise<void> {
  try {
    const supabase = createSupabaseAdminClient();
    const { error } = await supabase.from('tryon_metrics').insert({
      product_id: metric.productId,
      color: metric.color,
      provider: metric.provider,
      outcome: metric.outcome,
      duration_ms: metric.durationMs,
    });
    if (error) {
      console.error('Không thể lưu metrics thử đồ vào Supabase.', error.code);
    }
  } catch {
    console.error('Không thể kết nối Supabase để lưu metrics thử đồ.');
  }
}
