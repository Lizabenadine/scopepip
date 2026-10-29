-- Public contractor logos. Customer proposals can load the image without a login.

alter table public.profiles add column if not exists logo_url text not null default '';

insert into storage.buckets (id, name, public)
values ('company-assets', 'company-assets', true)
on conflict (id) do update set public = true;

create policy company_assets_public_read on storage.objects
for select to anon, authenticated
using (bucket_id = 'company-assets');

create policy company_assets_insert on storage.objects
for insert to authenticated
with check (
  bucket_id = 'company-assets'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy company_assets_update on storage.objects
for update to authenticated
using (
  bucket_id = 'company-assets'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'company-assets'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy company_assets_delete on storage.objects
for delete to authenticated
using (
  bucket_id = 'company-assets'
  and (storage.foldername(name))[1] = auth.uid()::text
);
