-- Basket: shared shopping list schema.
-- Paste this whole file into Supabase > SQL Editor > New query, then Run. Safe to run once on a new project.

create table if not exists categories (
  id bigint generated always as identity primary key,
  name text not null unique,
  sort_order int not null default 0
);

create table if not exists shops (
  id bigint generated always as identity primary key,
  name text not null unique,
  sort_order int not null default 0
);

create table if not exists items (
  id bigint generated always as identity primary key,
  name text not null,
  category_id bigint references categories(id) on delete set null,
  pending boolean not null default false,   -- on the shopping list
  picked boolean not null default false,    -- in the basket on the current trip
  quantity_note text not null default '',
  barcode text,
  photo_url text,
  notes text not null default '',
  updated_by text not null default '',
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index if not exists items_barcode_idx on items (barcode);

create table if not exists item_shops (
  item_id bigint not null references items(id) on delete cascade,
  shop_id bigint not null references shops(id) on delete cascade,
  price_eur numeric(8,2),
  price_updated_at timestamptz,
  primary key (item_id, shop_id)
);

-- Keep updated_at fresh on every item change.
create or replace function touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
drop trigger if exists items_touch on items;
create trigger items_touch before update on items for each row execute function touch_updated_at();

-- Only the signed-in household account can read or write anything.
alter table categories enable row level security;
alter table shops enable row level security;
alter table items enable row level security;
alter table item_shops enable row level security;

do $$
declare t text;
begin
  foreach t in array array['categories','shops','items','item_shops'] loop
    execute format('drop policy if exists household_all on %I', t);
    execute format('create policy household_all on %I for all to authenticated using (true) with check (true)', t);
  end loop;
end $$;

-- Tiny function the keep-alive job calls without signing in. Returns only a timestamp.
create or replace function ping() returns timestamptz language sql security definer as $$ select now() $$;
grant execute on function ping() to anon;

-- Live updates to the other phone.
alter publication supabase_realtime add table categories, shops, items, item_shops;

-- Starting data.
insert into categories (name, sort_order) values
  ('Veg & Fruit',1),('Dairy',2),('Meat & Fish',3),('Bakery',4),('Cupboard',5),
  ('Frozen',6),('Drinks',7),('Household',8),('Toiletries',9)
on conflict (name) do nothing;

insert into shops (name, sort_order) values
  ('Lidl',1),('Tesco',2),('Aldi',3),('SuperValu',4),('Dunnes',5),('Centra',6),('Indian Shop',7)
on conflict (name) do nothing;
