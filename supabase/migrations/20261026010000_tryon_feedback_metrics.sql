create table if not exists public.tryon_metrics (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  product_id text not null,
  color text not null,
  provider text not null check (provider in ('gemini', 'huggingface')),
  outcome text not null check (outcome in ('success', 'error')),
  duration_ms integer not null check (duration_ms between 0 and 60000)
);

create index if not exists tryon_metrics_created_at_idx
  on public.tryon_metrics (created_at desc);

create table if not exists public.tryon_feedback (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  product_id text not null,
  color text not null,
  provider text not null check (provider in ('gemini', 'huggingface')),
  duration_ms integer not null check (duration_ms between 0 and 60000),
  rating text not null check (rating in ('up', 'down')),
  reason text check (reason in ('áo méo', 'sai màu', 'mặt/tay lỗi', 'khác')),
  constraint tryon_feedback_reason_matches_rating check (
    (rating = 'up' and reason is null)
    or (rating = 'down' and reason is not null)
  )
);

create index if not exists tryon_feedback_created_at_idx
  on public.tryon_feedback (created_at desc);

alter table public.tryon_metrics enable row level security;
alter table public.tryon_feedback enable row level security;

revoke all on public.tryon_metrics from anon, authenticated;
revoke all on public.tryon_feedback from anon, authenticated;
grant usage, select on sequence public.tryon_metrics_id_seq to service_role;
grant usage, select on sequence public.tryon_feedback_id_seq to service_role;
grant select, insert on public.tryon_metrics to service_role;
grant select, insert on public.tryon_feedback to service_role;

create or replace function public.get_tryon_admin_metrics()
returns jsonb
language sql
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'tryOnCount', count(*)::integer,
    'successCount', count(*) filter (where outcome = 'success')::integer,
    'errorCount', count(*) filter (where outcome = 'error')::integer,
    'successRatePercent',
      case when count(*) = 0 then null
      else round(count(*) filter (where outcome = 'success') * 100.0 / count(*), 1)
      end,
    'averageDurationMs', round(avg(duration_ms))::integer,
    'feedbackCount', (select count(*)::integer from public.tryon_feedback),
    'thumbsUpPercent',
      (select case when count(*) = 0 then null
        else round(count(*) filter (where rating = 'up') * 100.0 / count(*), 1)
        end
       from public.tryon_feedback),
    'topNegativeReasons',
      (select coalesce(
        jsonb_agg(jsonb_build_object('reason', reason, 'count', reason_count)
          order by reason_count desc, reason),
        '[]'::jsonb
       )
       from (
         select reason, count(*)::integer as reason_count
         from public.tryon_feedback
         where rating = 'down' and reason is not null
         group by reason
         order by reason_count desc, reason
         limit 5
       ) as reasons)
  )
  from public.tryon_metrics;
$$;

revoke all on function public.get_tryon_admin_metrics() from public, anon, authenticated;
grant execute on function public.get_tryon_admin_metrics() to service_role;
