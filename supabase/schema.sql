-- Run this once in Supabase SQL Editor (Project > SQL Editor > New query)

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  ticker text not null,
  category text not null,
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
