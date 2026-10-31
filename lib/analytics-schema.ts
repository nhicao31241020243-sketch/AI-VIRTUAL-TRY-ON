export const PAGES = ['/', '/products', '/cart', '/privacy'] as const;
export const FEATURES = ['page', 'navigation', 'catalog', 'tryon', 'cart'] as const;
export const SOURCES = ['direct', 'search', 'social', 'email', 'campaign', 'referral'] as const;
export const DEVICES = ['desktop', 'mobile', 'tablet'] as const;
export const TARGETS = ['tryon-open', 'tryon-start', 'tryon-success', 'add-to-cart', 'download', 'catalog-view', 'catalog-tryon', 'catalog-filter', 'nav-home', 'nav-products', 'nav-privacy', 'nav-cart', 'cart-quantity', 'cart-remove', 'checkout-intent'] as const;
export const REASONS = ['Nội dung không hữu ích', 'Khó sử dụng', 'Thiếu thông tin', 'Lỗi kỹ thuật', 'Lý do khác'] as const;
export type Page = typeof PAGES[number];
export type Feature = typeof FEATURES[number];
export type Source = typeof SOURCES[number];
export type Device = typeof DEVICES[number];
export type Target = typeof TARGETS[number];
export type EventKind = 'page_view' | 'click' | 'impression' | 'scroll' | 'engagement' | 'conversion';
export interface ClientEvent {
  id: string;
  view: string;
  page: Page;
  feature: Feature;
  kind: EventKind;
  target?: Target;
  value?: number;
}
export interface Context {
  visitor: string;
  session: string;
  firstSeen: string;
  source: Source;
  device: Device;
  landing: Page;
}
export interface StoredEvent extends ClientEvent, Context {
  at: string;
  order?: number;
  suspect: 'bot' | 'burst' | null;
}
export interface Feedback extends Context {
  id: string;
  requestId: string;
  revision: number;
  at: string;
  page: Page;
  feature: Feature;
  rating: 'up' | 'down';
  reason: typeof REASONS[number] | null;
  comment: string;
  suspect: 'bot' | null;
}
export interface Quality {
  id: string;
  at: string;
  reason: 'invalid' | 'rate_limited' | 'duplicate_event' | 'duplicate_feedback';
  count: number;
}
export interface Dataset { events: StoredEvent[]; feedback: Feedback[]; quality: Quality[] }
export interface Filters { days: 7 | 30 | 90; page: string; feature: string; source: string; device: string }
export const uuid = (v: unknown): v is string => typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
export const record = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
export function isClientEvent(v: unknown): v is ClientEvent {
  if (!record(v) || Object.keys(v).some(k => !['id', 'view', 'page', 'feature', 'kind', 'target', 'value'].includes(k))) return false;
  if (!uuid(v.id) || !uuid(v.view) || !PAGES.includes(v.page as Page) || !FEATURES.includes(v.feature as Feature)) return false;
  if (['click', 'impression'].includes(String(v.kind))) return TARGETS.includes(v.target as Target) && v.value === undefined;
  if (v.kind === 'conversion') return ['tryon-start', 'tryon-success', 'add-to-cart'].includes(String(v.target)) && v.value === undefined;
  if (v.target !== undefined) return false;
  if (v.kind === 'page_view') return v.value === undefined && v.feature === 'page';
  if (v.kind === 'scroll') return [25, 50, 75, 100].includes(Number(v.value)) && typeof v.value === 'number' && v.feature === 'page';
  return v.kind === 'engagement' && typeof v.value === 'number' && Number.isInteger(v.value) && v.value > 0 && v.value <= 15000 && v.feature === 'page';
}
