-- Run in Supabase SQL Editor. Registers/updates the ticker -> category
-- bindings in 股票管理 to match your target allocation layout. Safe to
-- re-run — existing tickers get their category corrected, new ones get
-- added with zero holdings until you actually buy them.
with target_user as (
  select id from auth.users where email = 'abbycha23@gmail.com'
),
cat as (
  select id, name from public.categories where user_id = (select id from target_user)
),
mapping(ticker, category_name) as (
  values
    ('MRVL', '連接層'), ('AVGO', '連接層'), ('QCOM', '連接層'),
    ('NVDA', '運算層'), ('AMD', '運算層'),
    ('GOOG', '雲端層'), ('GOOGL', '雲端層'),
    ('GLW', '光學層'), ('COHR', '光學層'),
    ('NOK', '周邊基建'), ('SPCX', '周邊基建'),
    ('ARM', '架構層'), ('INTC', '架構層'),
    ('SKHY', '記憶體層')
)
insert into public.securities (user_id, ticker, category_id)
select (select id from target_user), m.ticker, cat.id
from mapping m
join cat on cat.name = m.category_name
on conflict (user_id, ticker) do update set category_id = excluded.category_id;
