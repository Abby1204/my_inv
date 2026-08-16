-- Run this in Supabase SQL Editor AFTER migration_002_categories.sql.
-- Adds a securities master table (ticker -> category, one row per ticker)
-- so category is tied to the ticker instead of being re-picked on every
-- transaction — which is what let AVGO/NVDA both end up under 雲端層 by
-- accident (that was just whatever category happened to be first in the
-- dropdown).

create table if not exists public.securities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  ticker text not null,
  category_id uuid not null references public.categories(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (user_id, ticker)
);

alter table public.securities enable row level security;

create policy "select own securities"
  on public.securities for select
  using (auth.uid() = user_id);

create policy "insert own securities"
  on public.securities for insert
  with check (auth.uid() = user_id);

create policy "update own securities"
  on public.securities for update
  using (auth.uid() = user_id);

create policy "delete own securities"
  on public.securities for delete
  using (auth.uid() = user_id);

grant select, insert, update, delete on public.securities to authenticated;

-- Backfill one security per ticker you've already traded, using whatever
-- category that ticker's most recent transaction happened to have. This is
-- just a starting point — go to 股票管理 right after running this and fix
-- any that ended up wrong (e.g. AVGO/NVDA currently mis-tagged 雲端層).
insert into public.securities (user_id, ticker, category_id)
select distinct on (t.user_id, t.ticker) t.user_id, t.ticker, t.category_id
from public.transactions t
order by t.user_id, t.ticker, t.created_at desc
on conflict (user_id, ticker) do nothing;

alter table public.transactions drop column if exists category_id;
