-- Basket update 5: a currency per household (euro, real, pound, dollar).
-- Paste into Supabase > SQL Editor, then Run. Safe to run more than once.
alter table households add column if not exists currency text not null default 'EUR';
alter table households drop constraint if exists households_currency_check;
alter table households add constraint households_currency_check check (currency in ('EUR', 'BRL', 'GBP', 'USD'));
