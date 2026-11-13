-- Basket update 3: notifications to the other phone.
-- Paste into Supabase > SQL Editor, then Run. Safe to run more than once.
-- Do this AFTER deploying the "notify" Edge Function (see SETUP.md).

create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

-- Who put an item on the list, when, and whether the other phone has been told.
alter table items add column if not exists pending_at timestamptz;
alter table items add column if not exists pending_by text;
alter table items add column if not exists notified boolean not null default true;

create or replace function mark_pending() returns trigger language plpgsql as $$
begin
  if new.pending and (tg_op = 'INSERT' or not old.pending) then
    new.pending_at = now(); new.pending_by = new.updated_by; new.notified = false;
  elsif not new.pending then
    new.notified = true;
  end if;
  return new;
end $$;
drop trigger if exists items_mark_pending on items;
create trigger items_mark_pending before insert or update on items for each row execute function mark_pending();

-- One row per phone that turned notifications on.
create table if not exists push_subscriptions (
  endpoint text primary key,
  person text not null,
  subscription jsonb not null,
  created_at timestamptz not null default now()
);
alter table push_subscriptions enable row level security;
drop policy if exists household_all on push_subscriptions;
create policy household_all on push_subscriptions for all to authenticated using (true) with check (true);

-- The sender's signing keys. No policies: only the Edge Function (service role) can read it.
create table if not exists app_keys (
  id int primary key default 1 check (id = 1),
  vapid jsonb not null,
  public_key text not null
);
alter table app_keys enable row level security;

-- Every minute: if someone added items and then went quiet for 3 minutes, ask the function to send one notification.
select cron.unschedule(jobid) from cron.job where jobname = 'basket-notify';
select cron.schedule('basket-notify', '* * * * *', $job$
  select net.http_post(
    url := 'https://tbdpyoggfjbcddpngqpt.supabase.co/functions/v1/notify',
    body := '{"action":"run"}'::jsonb,
    headers := '{"Content-Type":"application/json"}'::jsonb)
  where exists (
    select 1 from items i where not i.notified and i.pending
    group by i.pending_by having max(i.pending_at) < now() - interval '3 minutes')
$job$);
