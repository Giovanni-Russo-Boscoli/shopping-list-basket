-- Basket update 2: storage for item photos.
-- Paste into Supabase > SQL Editor, then Run. Safe to run more than once.
insert into storage.buckets (id, name, public) values ('photos', 'photos', true)
on conflict (id) do nothing;

drop policy if exists "household photos insert" on storage.objects;
create policy "household photos insert" on storage.objects for insert to authenticated with check (bucket_id = 'photos');
drop policy if exists "household photos update" on storage.objects;
create policy "household photos update" on storage.objects for update to authenticated using (bucket_id = 'photos');
drop policy if exists "household photos delete" on storage.objects;
create policy "household photos delete" on storage.objects for delete to authenticated using (bucket_id = 'photos');
