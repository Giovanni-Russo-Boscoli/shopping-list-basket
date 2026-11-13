-- Basket update 4: personal accounts and households.
-- Paste into Supabase > SQL Editor, then Run. Run it once, after 001-003.
-- Afterwards, the result shows the invite code of the household that now holds your existing list.

-- ---------- households and members ----------
create table if not exists households (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Home',
  invite_code text not null unique default substr(replace(gen_random_uuid()::text, '-', ''), 1, 10),
  created_at timestamptz not null default now()
);
create table if not exists members (
  household_id uuid not null references households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null,
  joined_at timestamptz not null default now(),
  primary key (household_id, user_id)
);

-- True when the signed-in person belongs to the household. Used by every security rule below.
create or replace function is_member(hid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from members where household_id = hid and user_id = auth.uid())
$$;

-- ---------- tie existing data to a household ----------
alter table categories add column if not exists household_id uuid references households(id) on delete cascade;
alter table shops add column if not exists household_id uuid references households(id) on delete cascade;
alter table items add column if not exists household_id uuid references households(id) on delete cascade;
alter table item_shops add column if not exists household_id uuid references households(id) on delete cascade;
alter table push_subscriptions add column if not exists household_id uuid references households(id) on delete cascade;
alter table push_subscriptions add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table items add column if not exists pending_by_user uuid;

do $$
declare hid uuid;
begin
  if exists (select 1 from categories where household_id is null) or exists (select 1 from items where household_id is null) then
    insert into households (name) values ('Home') returning id into hid;
    update categories set household_id = hid where household_id is null;
    update shops set household_id = hid where household_id is null;
    update items set household_id = hid where household_id is null;
    update item_shops set household_id = hid where household_id is null;
    delete from push_subscriptions where household_id is null; -- phones turn notifications on again after signing in
  end if;
end $$;

alter table categories alter column household_id set not null;
alter table shops alter column household_id set not null;
alter table items alter column household_id set not null;
alter table item_shops alter column household_id set not null;

-- Names only need to be unique inside a household now.
alter table categories drop constraint if exists categories_name_key;
alter table shops drop constraint if exists shops_name_key;
create unique index if not exists categories_household_name on categories (household_id, name);
create unique index if not exists shops_household_name on shops (household_id, name);
create index if not exists items_household on items (household_id);

-- Record which account put an item on the list (for notifications).
create or replace function mark_pending() returns trigger language plpgsql as $$
begin
  if new.pending and (tg_op = 'INSERT' or not old.pending) then
    new.pending_at = now(); new.pending_by = new.updated_by; new.pending_by_user = auth.uid(); new.notified = false;
  elsif not new.pending then
    new.notified = true;
  end if;
  return new;
end $$;

-- ---------- security rules: you only ever see your own households ----------
alter table households enable row level security;
alter table members enable row level security;
do $$
declare t text;
begin
  foreach t in array array['categories','shops','items','item_shops','push_subscriptions'] loop
    execute format('drop policy if exists household_all on %I', t);
    execute format('drop policy if exists member_all on %I', t);
    execute format('create policy member_all on %I for all to authenticated using (is_member(household_id)) with check (is_member(household_id))', t);
  end loop;
end $$;
drop policy if exists push_own on push_subscriptions;
drop policy if exists member_read on households;
create policy member_read on households for select to authenticated using (is_member(id));
drop policy if exists member_rename on households;
create policy member_rename on households for update to authenticated using (is_member(id)) with check (is_member(id));
drop policy if exists member_read on members;
create policy member_read on members for select to authenticated using (is_member(household_id));
drop policy if exists own_name on members;
create policy own_name on members for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists own_leave on members;
create policy own_leave on members for delete to authenticated using (user_id = auth.uid());

-- ---------- creating and joining households ----------
create or replace function create_household(p_name text, p_display_name text) returns uuid
language plpgsql security definer set search_path = public as $$
declare hid uuid;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  insert into households (name) values (coalesce(nullif(trim(p_name), ''), 'Home')) returning id into hid;
  insert into members (household_id, user_id, display_name) values (hid, auth.uid(), trim(p_display_name));
  insert into categories (household_id, name, sort_order) values
    (hid,'Veg & Fruit',1),(hid,'Dairy',2),(hid,'Meat & Fish',3),(hid,'Bakery',4),(hid,'Cupboard',5),
    (hid,'Frozen',6),(hid,'Drinks',7),(hid,'Household',8),(hid,'Toiletries',9);
  insert into shops (household_id, name, sort_order) values
    (hid,'Lidl',1),(hid,'Tesco',2),(hid,'Aldi',3),(hid,'SuperValu',4),(hid,'Dunnes',5),(hid,'Centra',6);
  return hid;
end $$;

create or replace function join_household(p_code text, p_display_name text) returns uuid
language plpgsql security definer set search_path = public as $$
declare hid uuid;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  select id into hid from households where invite_code = lower(trim(p_code));
  if hid is null then raise exception 'invalid invite code'; end if;
  insert into members (household_id, user_id, display_name) values (hid, auth.uid(), trim(p_display_name))
  on conflict (household_id, user_id) do nothing;
  return hid;
end $$;

-- Lets a member issue a fresh invite code (old links stop working).
create or replace function new_invite_code(p_household uuid) returns text
language plpgsql security definer set search_path = public as $$
declare c text;
begin
  if not is_member(p_household) then raise exception 'not a member'; end if;
  update households set invite_code = substr(replace(gen_random_uuid()::text, '-', ''), 1, 10) where id = p_household returning invite_code into c;
  return c;
end $$;

revoke all on function create_household(text, text), join_household(text, text), new_invite_code(uuid) from public, anon;
grant execute on function create_household(text, text), join_household(text, text), new_invite_code(uuid) to authenticated;

-- Live updates for the new tables.
do $$ begin
  alter publication supabase_realtime add table members, households;
exception when duplicate_object then null; end $$;

-- Show the invite code of the household that holds your existing list.
select name, invite_code from households order by created_at;
