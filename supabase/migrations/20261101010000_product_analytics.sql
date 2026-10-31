-- New product analytics is independent of legacy tryon_metrics / tryon_feedback.
begin;
create table if not exists public.product_events (
  id uuid primary key,
  occurred_at timestamptz not null,
  data jsonb not null check (jsonb_typeof(data) = 'object'),
  dedup_key text unique
);
create table if not exists public.product_feedback (
  id uuid primary key,
  occurred_at timestamptz not null,
  revision integer not null check (revision > 0),
  data jsonb not null check (char_length(data->>'comment') <= 500 and data->>'rating' in ('up','down'))
);
create table if not exists public.product_quality (
  id uuid primary key,
  occurred_at timestamptz not null,
  data jsonb not null check (jsonb_typeof(data) = 'object')
);
create index if not exists product_events_time on public.product_events (occurred_at desc, id);
create index if not exists product_feedback_time on public.product_feedback (occurred_at desc, id);
create index if not exists product_quality_time on public.product_quality (occurred_at desc, id);
alter table public.product_events enable row level security;
alter table public.product_feedback enable row level security;
alter table public.product_quality enable row level security;
revoke all on public.product_events, public.product_feedback, public.product_quality from public, anon, authenticated;
grant select, insert, update, delete on public.product_events, public.product_feedback, public.product_quality to service_role;

create or replace function public.insert_product_events(items jsonb)
returns integer language plpgsql security invoker set search_path = public as $$
declare item jsonb; inserted integer; duplicates integer := 0; dedup text;
begin
  if jsonb_typeof(items) <> 'array' or jsonb_array_length(items) not between 1 and 30 then raise exception 'Invalid batch'; end if;
  for item in select value from jsonb_array_elements(items) loop
    dedup := case when item->>'kind' in ('page_view','scroll','impression')
      then concat_ws(':', item->>'visitor', item->>'view', item->>'kind', coalesce(item->>'target',''), coalesce(item->>'value','')) else null end;
    insert into public.product_events (id,occurred_at,data,dedup_key)
      values ((item->>'id')::uuid,(item->>'at')::timestamptz,item,dedup)
      on conflict do nothing;
    get diagnostics inserted = row_count;
    if inserted = 0 then duplicates := duplicates + 1; end if;
  end loop;
  return duplicates;
end;
$$;

create or replace function public.save_product_feedback(item jsonb, expected_revision integer)
returns text language plpgsql security invoker set search_path = public as $$
declare previous public.product_feedback%rowtype; item_id uuid := (item->>'id')::uuid;
begin
  -- Serialize even the first insert for this anonymous visitor/page/feature key.
  perform pg_advisory_xact_lock(hashtextextended(item_id::text, 0));
  select * into previous from public.product_feedback where id = item_id;
  if found then
    if previous.data->>'requestId' = item->>'requestId' then return 'duplicate'; end if;
    if previous.revision <> expected_revision then return 'conflict'; end if;
  elsif expected_revision <> 0 then return 'conflict';
  end if;
  if (item->>'revision')::integer <> expected_revision + 1 then raise exception 'Invalid revision'; end if;
  insert into public.product_feedback (id,occurred_at,revision,data)
    values (item_id,(item->>'at')::timestamptz,expected_revision+1,item)
    on conflict (id) do update set occurred_at=excluded.occurred_at, revision=excluded.revision, data=excluded.data;
  return 'saved';
end;
$$;

create or replace function public.prune_product_analytics()
returns void language sql security invoker set search_path = public as $$
  delete from public.product_events where occurred_at < now() - interval '90 days';
  delete from public.product_feedback where occurred_at < now() - interval '90 days';
  delete from public.product_quality where occurred_at < now() - interval '90 days';
$$;
revoke all on function public.insert_product_events(jsonb), public.save_product_feedback(jsonb,integer), public.prune_product_analytics() from public, anon, authenticated;
grant execute on function public.insert_product_events(jsonb), public.save_product_feedback(jsonb,integer), public.prune_product_analytics() to service_role;
commit;
-- Schedule daily with Supabase Cron (pg_cron), or an external secured server job:
-- select public.prune_product_analytics();
