import type { Dataset, Feedback, Filters, StoredEvent } from './analytics-schema';

const DAY = 86400000;
export function ratio(count: number, sample: number) { return { count, sample, percent: sample ? Math.round(count / sample * 1000) / 10 : null }; }
function unique<T>(rows: T[], key: (x: T) => string) { return new Set(rows.map(key)).size; }
function counts<T>(rows: T[], key: (x: T) => string) {
  const map = new Map<string, number>();
  rows.forEach(x => map.set(key(x), (map.get(key(x)) || 0) + 1));
  return [...map].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}
export function summarize(data: Dataset, filters: Filters, now = Date.now()) {
  const start = now - filters.days * DAY;
  const inTime = (x: { at: string }) => Date.parse(x.at) >= start && Date.parse(x.at) <= now;
  const context = (x: StoredEvent | Feedback) => (!filters.page || x.page === filters.page) && (!filters.source || x.source === filters.source) && (!filters.device || x.device === filters.device);
  // A flagged session is excluded as a whole, rather than silently mixing its earlier events.
  const suspectSessions = new Set(data.events.filter(e => e.suspect).map(e => e.session));
  data.feedback.filter(f => f.suspect).forEach(f => suspectSessions.add(f.session));
  const clean = data.events.filter(e => !suspectSessions.has(e.session));
  const candidates = clean.filter(e => inTime(e) && context(e));
  const featureViews = new Set(candidates.filter(e => e.feature === filters.feature).map(e => e.view));
  const events = candidates.filter(e => !filters.feature || featureViews.has(e.view) && (e.feature === filters.feature || e.feature === 'page')).sort((a,b) => a.at.localeCompare(b.at) || (a.order || 0) - (b.order || 0));
  const views = events.filter(e => e.kind === 'page_view');
  const viewIds = new Set(views.map(e => e.view));
  const sessions = new Set(events.map(e => e.session));
  const clicks = events.filter(e => e.kind === 'click');
  const conversions = events.filter(e => e.kind === 'conversion');
  const feedback = data.feedback.filter(f => !suspectSessions.has(f.session) && inTime(f) && context(f) && (!filters.feature || f.feature === filters.feature));
  const duration = new Map<string, number>();
  events.filter(e => e.kind === 'engagement' && viewIds.has(e.view)).forEach(e => duration.set(e.view, (duration.get(e.view) || 0) + (e.value || 0)));
  const meaningful = new Set(events.filter(e => e.kind === 'conversion' || e.kind === 'click').map(e => e.session));
  for (const view of views) if ((duration.get(view.view) || 0) >= 10000) meaningful.add(view.session);
  const visitors = new Map<string, string>();
  events.forEach(e => visitors.set(e.visitor, e.firstSeen));
  const returning = new Set([...visitors].filter(([, first]) => Date.parse(first) < start).map(([id]) => id));
  const goals = ['tryon-start', 'tryon-success', 'add-to-cart'];
  const funnelSets = goals.map(() => new Set<string>());
  for (const session of sessions) {
    let step = 0;
    for (const e of events.filter(e => e.session === session)) {
      if (e.kind === 'conversion' && e.target === goals[step]) { funnelSets[step].add(session); step++; }
      if (step === goals.length) break;
    }
  }
  const converted = new Set(conversions.filter(e => e.target === 'add-to-cart').map(e => e.session));
  const groupConversion = (key: (e: StoredEvent) => string) => [...new Set(events.map(key))].map(label => {
    const rows = events.filter(e => key(e) === label);
    return { label, ...ratio(unique(rows.filter(e => e.kind === 'conversion' && e.target === 'add-to-cart'), e => e.session), unique(rows, e => e.session)) };
  });
  const retention = [1,7,30].map(days => {
    const eligible = [...visitors].filter(([, first]) => Date.parse(first) >= start && Date.parse(first) + 2 * days * DAY <= now);
    const returned = eligible.filter(([visitor, first]) => clean.some(e => e.visitor === visitor && e.kind === 'page_view' && context(e) && Date.parse(e.at) >= Date.parse(first) + days * DAY && Date.parse(e.at) < Date.parse(first) + 2 * days * DAY));
    return { days, ...ratio(returned.length, eligible.length) };
  });
  const excluded = data.events.filter(e => inTime(e) && context(e) && suspectSessions.has(e.session) && (!filters.feature || e.feature === filters.feature || e.feature === 'page'));
  return {
    range: { from: new Date(start).toISOString(), to: new Date(now).toISOString() },
    traffic: { visitors: visitors.size, sessions: sessions.size, views: unique(views, e => e.view), newVisitors: visitors.size - returning.size, returningVisitors: returning.size, sources: counts([...new Map(events.map(e => [e.session, e])).values()], e => e.source), landing: counts([...new Map(events.map(e => [e.session, e])).values()], e => e.landing), pages: counts(views, e => e.page) },
    interactions: { clicks: clicks.length, byElement: counts(clicks, e => `${e.page} · ${e.target}`), ctr: [...new Set(events.filter(e => e.kind === 'impression').map(e => e.target!))].map(target => {
      const exposed = new Set(events.filter(e => e.kind === 'impression' && e.target === target).map(e => e.view));
      return { label: target, ...ratio(unique(clicks.filter(e => e.target === target && exposed.has(e.view)), e => e.view), exposed.size) };
    }) },
    engagement: { milliseconds: [...duration.values()].reduce((a,b) => a+b,0), sample: viewIds.size, meaningful: ratio(meaningful.size, sessions.size), scroll: [25,50,75,100].map(depth => ({ depth, ...ratio(unique(events.filter(e => e.kind === 'scroll' && e.value === depth && viewIds.has(e.view)), e => e.view), viewIds.size) })) },
    conversion: { goals: goals.map(goal => ({ label: goal, count: conversions.filter(e => e.target === goal).length })), rate: ratio(converted.size, sessions.size), byPage: groupConversion(e => e.page), bySource: groupConversion(e => e.source), funnel: goals.map((goal,i) => ({ label: goal, ...ratio(funnelSets[i].size, i === 0 ? sessions.size : funnelSets[i-1].size), dropoff: ratio((i === 0 ? sessions.size : funnelSets[i-1].size) - funnelSets[i].size, i === 0 ? sessions.size : funnelSets[i-1].size) })), byVisitor: [false,true].map(isReturning => {
      const rows = events.filter(e => returning.has(e.visitor) === isReturning);
      return { label: isReturning ? 'Quay lại' : 'Mới trong kỳ', ...ratio(unique(rows.filter(e => e.kind === 'conversion' && e.target === 'add-to-cart'), e => e.visitor), unique(rows, e => e.visitor)) };
    }) },
    feedback: { total: feedback.length, up: ratio(feedback.filter(f => f.rating === 'up').length, feedback.length), down: ratio(feedback.filter(f => f.rating === 'down').length, feedback.length), reasons: counts(feedback.filter(f => f.rating === 'down'), f => f.reason || 'Không rõ'), byPage: counts(feedback, f => `${f.page} · ${f.feature} · ${f.rating === 'up' ? '👍' : '👎'}`), trend: counts(feedback, f => `${f.at.slice(0,10)} · ${f.rating === 'up' ? '👍' : '👎'}`).sort((a,b) => b.label.localeCompare(a.label)), comments: feedback.filter(f => f.comment).sort((a,b) => b.at.localeCompare(a.at)).slice(0,100).map(({ id, at, page, feature, rating, comment }) => ({ id, at, page, feature, rating, comment })) },
    quality: { excludedEvents: excluded.length, suspectSessions: unique(excluded, e => e.session), botEvents: excluded.filter(e => e.suspect === 'bot').length, abnormalClicks: excluded.filter(e => e.suspect === 'burst').length, excludedFeedback: data.feedback.filter(f => inTime(f) && context(f) && (!filters.feature || f.feature === filters.feature) && suspectSessions.has(f.session)).length, counters: counts(data.quality.filter(inTime).flatMap(q => [{ reason: q.reason, count: q.count }]), q => q.reason).map(row => ({ ...row, count: data.quality.filter(q => inTime(q) && q.reason === row.label).reduce((n,q) => n+q.count,0) })) },
    retention,
  };
}
export type AnalyticsSummary = ReturnType<typeof summarize>;
