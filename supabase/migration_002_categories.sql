-- Run this in Supabase SQL Editor AFTER schema.sql.
-- Adds a categories master table and switches transactions to reference it
-- by id instead of storing the category name as free text on every row.

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

-- Swap transactions.category (text) for transactions.category_id (fk).
-- Assumes the transactions table is currently empty — if you still have
-- real rows in it, back them up first, this does not migrate the data.
alter table public.transactions add column if not exists category_id uuid references public.categories(id) on delete restrict;
alter table public.transactions drop column if exists category;
alter table public.transactions alter column category_id set not null;

-- Optional: seed your categories from the screenshot layout. Replace the
-- email if this isn't the account you signed up with.
insert into public.categories (user_id, name, sort_order)
select u.id, c.name, c.ord
from auth.users u
cross join lateral unnest(array['連接層', '運算層', '雲端層', '光學層', '周邊基建', '架構層', '記憶體層'])
  with ordinality as c(name, ord)
where u.email = 'abbycha23@gmail.com'
on conflict (user_id, name) do nothing;
