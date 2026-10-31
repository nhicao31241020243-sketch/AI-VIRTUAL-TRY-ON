import 'server-only';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { createSupabaseAdminClient } from './supabase-admin';
import type { Dataset, Feedback, Quality, StoredEvent } from './analytics-schema';

const LIMIT = 20000;
const DAY = 86400000;
const state = globalThis as typeof globalThis & { analyticsWrite?: Promise<unknown> };
export function storageMode() {
  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) return 'supabase' as const;
  if (process.env.NODE_ENV === 'development') return 'local-development' as const;
  throw new Error('Supabase chưa được cấu hình.');
}
async function local<T>(operation: (data: Dataset) => T, write = true): Promise<T> {
  const job = (state.analyticsWrite || Promise.resolve()).catch(() => {}).then(async () => {
    const directory = path.resolve(process.env.ANALYTICS_LOCAL_DIR || '.data/analytics');
    const file = path.join(directory, 'data.json');
    let data: Dataset = { events: [], feedback: [], quality: [] };
    try { data = JSON.parse(await readFile(file, 'utf8')) as Dataset; }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
    const cutoff = new Date(Date.now() - 90 * DAY).toISOString();
    data.events = data.events.filter(x => x.at >= cutoff);
    data.feedback = data.feedback.filter(x => x.at >= cutoff);
    data.quality = data.quality.filter(x => x.at >= cutoff);
    const result = operation(data);
    if (write) {
      if (data.events.length + data.feedback.length + data.quality.length > LIMIT) throw new Error('Local analytics capacity reached.');
      await mkdir(directory, { recursive: true });
      const temporary = `${file}.${randomUUID()}.tmp`;
      await writeFile(temporary, JSON.stringify(data), { mode: 0o600 });
      await rename(temporary, file);
    }
    return result;
  });
  state.analyticsWrite = job;
  return job;
}
export async function saveEvents(events: StoredEvent[]): Promise<number> {
  if (storageMode() === 'local-development') return local(data => {
    let duplicates = 0;
    for (const event of events) {
      if (data.events.some(x => x.id === event.id || (x.visitor === event.visitor && x.view === event.view && x.kind === event.kind && x.target === event.target && x.value === event.value && ['page_view', 'scroll', 'impression'].includes(event.kind)))) duplicates++;
      else data.events.push(event);
    }
    return duplicates;
  });
  const { data, error } = await createSupabaseAdminClient().rpc('insert_product_events', { items: events });
  if (error) throw error;
  return Number(data);
}
export async function saveFeedback(feedback: Feedback, expectedRevision: number): Promise<'saved' | 'duplicate' | 'conflict'> {
  if (storageMode() === 'local-development') return local(data => {
    const index = data.feedback.findIndex(x => x.id === feedback.id);
    const previous = data.feedback[index];
    if (previous?.requestId === feedback.requestId) return 'duplicate';
    if ((previous?.revision || 0) !== expectedRevision) return 'conflict';
    if (index >= 0) data.feedback[index] = feedback; else data.feedback.push(feedback);
    return 'saved';
  });
  const { data, error } = await createSupabaseAdminClient().rpc('save_product_feedback', { item: feedback, expected_revision: expectedRevision });
  if (error) throw error;
  return data as 'saved' | 'duplicate' | 'conflict';
}
export async function readFeedback(id: string): Promise<Feedback | null> {
  if (storageMode() === 'local-development') return local(data => data.feedback.find(x => x.id === id) || null, false);
  const { data, error } = await createSupabaseAdminClient().from('product_feedback').select('data').eq('id', id).maybeSingle();
  if (error) throw error;
  return data?.data as Feedback || null;
}
export async function quality(reason: Quality['reason'], count = 1) {
  const row: Quality = { id: randomUUID(), at: new Date().toISOString(), reason, count };
  try {
    if (storageMode() === 'local-development') await local(data => { data.quality.push(row); });
    else {
      const { error } = await createSupabaseAdminClient().from('product_quality').insert({ id: row.id, occurred_at: row.at, data: row });
      if (error) throw error;
    }
  } catch { console.error('Analytics quality counter could not be persisted.'); }
}
export async function readDataset(): Promise<{ data: Dataset; truncated: boolean; mode: string }> {
  const mode = storageMode();
  if (mode === 'local-development') return { data: await local(data => data, false), truncated: false, mode };
  const db = createSupabaseAdminClient();
  const cutoff = new Date(Date.now() - 90 * DAY).toISOString();
  async function read(table: string) {
    const rows: unknown[] = [];
    for (let from = 0; from <= LIMIT; from += 1000) {
      const { data, error } = await db.from(table).select('data').gte('occurred_at', cutoff).order('occurred_at', { ascending: false }).order('id').range(from, from + 999);
      if (error) throw error;
      rows.push(...data.map(x => x.data));
      if (data.length < 1000) break;
    }
    return rows;
  }
  const [events, feedback, counters] = await Promise.all([read('product_events'), read('product_feedback'), read('product_quality')]);
  return { data: { events: events.slice(0, LIMIT) as StoredEvent[], feedback: feedback.slice(0, LIMIT) as Feedback[], quality: counters.slice(0, LIMIT) as Quality[] }, truncated: [events, feedback, counters].some(x => x.length > LIMIT), mode };
}
