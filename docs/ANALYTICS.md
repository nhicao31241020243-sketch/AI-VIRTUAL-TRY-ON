# Product analytics & feedback

## Open and authorize

1. Set server-only `ADMIN_METRICS_PASSWORD` (minimum 12 characters, preferably a randomly generated 32+ character value) and `ANALYTICS_SECRET` (random, minimum 32 characters) in `.env.local` or deployment secrets.
2. Start with `npm.cmd run dev` on Windows (`npm run dev` elsewhere).
3. Click the **Dashboard** button, always visible at the bottom left. Unauthenticated visitors are redirected to `/admin/login`; authorized users open `/admin/metrics`. It collapses to an icon on small screens and hides while a modal is open.

The project has no user-account/role system. It reuses the existing shared analytics-admin password; only give this credential to authorized administrators/analysts. All such users can see comments. The page checks a signed, expiring HttpOnly session cookie on the server; the analytics and legacy metrics APIs independently enforce the same authorization. A public request is redirected to login and an unauthenticated API call returns 401. Login/logout reject cross-origin requests; login is rate limited. Changing the password revokes existing sessions. Login expires after eight hours. The fixed button is not the access-control boundary.

## Storage and migration

- With `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`, apply [the product analytics migration](../supabase/migrations/20261101010000_product_analytics.sql). Apply [the earlier migration](../supabase/migrations/20261026010000_tryon_feedback_metrics.sql) if legacy try-on metrics are needed.
- New tables: `product_events`, `product_feedback`, `product_quality`. RLS is enabled, public/anon/authenticated table and function privileges are revoked, only the server service role can read/write. Secrets never use `NEXT_PUBLIC_`.
- Events use unique UUIDs and natural deduplication for page views, scroll milestones and CTA exposure. Feedback uses a server-derived key per anonymous visitor/page/feature, optimistic revisions and a stable request UUID. The SQL RPC serializes concurrent edits; retrying a successful request cannot create another opinion or overwrite a newer revision.
- Without Supabase, **development only** uses `.data/analytics/data.json`, excluded from Git. `ANALYTICS_LOCAL_DIR` overrides the directory for isolated checks. Writes are serialized within the single Node process and committed with an atomic rename. This fallback is not suitable for multiple processes or serverless production; production fails closed with 503 instead of silently using local storage.
- Development storage is capped at 20,000 total rows. It refuses new writes with 503 when full. The Supabase reader is capped at 20,000 rows per table; overflow is explicitly marked as a partial sample and retention is disabled. Move aggregation to indexed SQL for larger deployments.
- Dashboard queries only the most recent 90 days. Local files prune older rows when written. In Supabase, configure a daily secured job/Cron to run `select public.prune_product_analytics();` for actual deletion. The migration defines the function but does **not** silently install a scheduled job. Legacy tables retain their existing policy.

## What is collected

- `POST /api/analytics/events`: bounded batches of page views, allowlisted component clicks/exposures, scroll milestones 25/50/75/100, active milliseconds, and client-observed goals.
- `GET/POST /api/analytics/feedback`: load the current browser's own opinion or save/update it. 👍/👎, required reason for 👎, optional 500-character comment. Feedback is also available after a successful try-on. Retrying retains the same idempotency key; editing in another tab gives a conflict and a reload action.
- Signed first-party anonymous cookie: 90-day absolute lifetime. Signed session cookie: 30 minutes inactivity, renewed by accepted events. No fingerprinting. First-touch source/landing are retained for the session. Query strings are never sent; UTM medium and referrer are reduced to a fixed category. Device is a coarse UA-derived category; raw UA and IP are not persisted.
- Tracking skips admin and local metrics pages. Active time requires document visibility and focus and stops after 60 seconds with no key/pointer/scroll activity. It is flushed periodically and when the page hides. The client buffers at most 120 events in memory, retries transient errors with backoff, and may lose events on abrupt exits or extended offline periods.
- Footer controls allow behavioral analytics to be disabled; DNT/GPC also disable it. Explicit feedback still works using the anonymous cookie. Browser opt-out does not delete already saved historical data.
- No image, input value, arbitrary DOM text, full referrer, arbitrary URL, or typed form content is collected. Comments are intentionally user-entered and may contain sensitive text despite the UI reminder; access is restricted to analysts and follows the same retention policy.

## Definitions and limits

- Visitors are approximate unique cookie IDs, not verified people. New means first seen **within the selected period**; returning means first seen before it. Deleting cookies/changing browser creates another visitor.
- CTR denominator: distinct page views with CTA visibility of at least 50% or an actual click; numerator: those exposed page views with one or more clicks. Repeated product-card CTAs of the same type are grouped.
- Scroll = visible bottom of viewport / document height; it is not proof of reading. Pages shorter than a viewport may immediately reach 100%.
- Meaningful session: at least 10 seconds active on one page, a tracked click, or a goal. Ratios always include count/sample. Feature filters select views interacting with that feature and retain their page events for denominators.
- Goals: try-on started, result received, add to cart. Funnel requires these in order in one session, including across pages. Starting also includes image preparation attempts; failures/cancellations contribute to dropoff. Goals are client observations and can be blocked or fabricated; they are not verified server transactions. There is no implemented checkout, registration, article or video completion flow; no purchase/revenue or video metrics are invented.
- Feedback counts reflect the current opinion, not every revision. Trends use last update date. Comments are plain escaped React text; no HTML rendering. The optional legacy metrics panel retains the existing all-time server try-on statistics separately.
- D1/W1/M1: cohort first seen in the selected period, returning in `[1,2)`, `[7,14)`, `[30,60)` days after first seen respectively. A visitor enters the denominator only after the full observation window. Feature filters constrain cohort membership; return visits respect page/source/device filters. Empty or immature cohorts produce “not enough data,” not 0%.
- Bot suspicion uses UA patterns, missing UA, and bursts over 30 clicks/10 seconds. Entire flagged sessions are excluded from main metrics, including earlier events and feedback. This heuristic can have false positives/negatives. Invalid/rate-limited requests and duplicate requests are counted separately for the whole site in the period (they cannot reliably use page/feature filters). A duplicate is often a retry, not spam.
- Rate limits use the existing in-memory limiter: 120 event batches/minute/IP, 30 feedback writes/minute/IP, 60 feedback reads/minute/IP, plus existing login limits. IPs are hashed in memory; client proxy headers must be overwritten by a trusted deployment proxy. For multi-instance deployments use shared atomic rate limiting. Counters are best effort if storage itself is unavailable. These controls do not establish that traffic is human.

## Checks

```sh
npm run lint
node --test tests/analytics.test.mjs
npm run build
```

For API integration checks, stop other Next servers using the same `.next` directory. In a temporary shell, set a **test-only** `ADMIN_METRICS_PASSWORD`, a 32+ character `ANALYTICS_SECRET`, and `ANALYTICS_LOCAL_DIR=.data/analytics-integration-check-<unique-run>`. Leave Supabase variables unset. Start `next dev -p 3101`. In another shell set `ANALYTICS_TEST_PASSWORD` to the same test password and run:

```sh
node tests/analytics-api.mjs
```

Use a fresh test directory per run. The script checks authentication, server route protection, cross-origin rejection, input bounds, duplicate writes, optimistic conflicts, own-feedback isolation, funnel aggregation, filters, bot/burst exclusion and rate limits. It creates explicitly labeled synthetic feedback in the isolated test directory only. Stop that server before running a build or restarting the normal app. Supabase RPCs must also be applied and exercised in a staging database before production; local integration checks do not certify a remote database migration.
