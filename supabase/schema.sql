-- Run this once in Supabase SQL Editor (Project > SQL Editor > New query).
-- For a project that already ran an older version of this file (transactions
-- with a free-text "category" column), run supabase/migration_002_categories.sql
-- instead — it upgrades an existing table in place.

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

alter table public.categories enable row level security;

create policy "select own categories"
  on public.categories for select
  using (auth.uid() = user_id);

create policy "insert own categories"
  on public.categories for insert
  with check (auth.uid() = user_id);

create policy "update own categories"
  on public.categories for update
  using (auth.uid() = user_id);

create policy "delete own categories"
  on public.categories for delete
  using (auth.uid() = user_id);

grant select, insert, update, delete on public.categories to authenticated;

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  ticker text not null,
  category_id uuid not null references public.categories(id) on delete restrict,
  action text not null check (action in ('buy', 'sell')),
  shares numeric not null check (shares > 0),
  price numeric not null check (price >= 0),
  trade_date date not null default current_date,
  note text,
  created_at timestamptz not null default now()
);

alter table public.transactions enable row level security;

create policy "select own transactions"
  on public.transactions for select
  using (auth.uid() = user_id);

create policy "insert own transactions"
  on public.transactions for insert
  with check (auth.uid() = user_id);

create policy "update own transactions"
  on public.transactions for update
  using (auth.uid() = user_id);

create policy "delete own transactions"
  on public.transactions for delete
  using (auth.uid() = user_id);

create index if not exists transactions_user_id_idx on public.transactions(user_id);
create index if not exists transactions_category_id_idx on public.transactions(category_id);

-- Table-level grant to PostgREST's "authenticated" role. Needed regardless of
-- the "Automatically expose new tables" project setting — RLS policies above
-- control *which rows*, this controls whether the API can touch the table at
-- all. Only "authenticated" gets it; "anon" is left with no access since
-- every operation here requires a logged-in user.
grant select, insert, update, delete on public.transactions to authenticated;
