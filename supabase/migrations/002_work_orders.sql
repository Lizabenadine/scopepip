-- Cabinet production, crew work orders, and the site-photos bucket.
-- Crew tables store scope for the field. Prices stay on estimates and line_items.

alter type public.line_source add value if not exists 'cabinets';

alter table public.rate_cards
  add column cabinet_door_sqft numeric(10, 2) not null default 7 check (cabinet_door_sqft >= 0),
  add column cabinet_doors_per_hour numeric(10, 2) not null default 2.5 check (cabinet_doors_per_hour >= 0);

alter table public.estimates
  add column cabinet_doors integer not null default 0 check (cabinet_doors >= 0),
  add column cabinet_door_sqft numeric(10, 2) not null default 7 check (cabinet_door_sqft >= 0),
  add column cabinet_doors_per_hour numeric(10, 2) not null default 2.5 check (cabinet_doors_per_hour >= 0);

create table public.work_orders (
  estimate_id uuid primary key references public.estimates (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  prep_notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.work_order_paint_specs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  estimate_id uuid not null references public.work_orders (estimate_id) on delete cascade,
  area text not null check (area in ('walls', 'trim', 'cabinets')),
  product text not null default '',
  sheen text not null default '',
  color text not null default '',
  sort_order integer not null default 0,
  unique (estimate_id, area)
);

create table public.work_order_checklist (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  estimate_id uuid not null references public.work_orders (estimate_id) on delete cascade,
  label text not null,
  done boolean not null default false,
  sort_order integer not null default 0
);

create table public.site_photos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  estimate_id uuid not null references public.work_orders (estimate_id) on delete cascade,
  storage_path text not null,
  caption text not null default '',
  created_at timestamptz not null default now()
);

create index work_order_checklist_estimate_idx
  on public.work_order_checklist (estimate_id, sort_order);
create index site_photos_estimate_idx
  on public.site_photos (estimate_id, created_at desc);

create trigger work_orders_updated_at
before update on public.work_orders
for each row execute function public.set_updated_at();

alter table public.work_orders enable row level security;
alter table public.work_order_paint_specs enable row level security;
alter table public.work_order_checklist enable row level security;
alter table public.site_photos enable row level security;

create policy work_orders_all on public.work_orders
for all to authenticated
using (user_id = auth.uid())
with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.estimates
    where id = estimate_id and user_id = auth.uid()
  )
);

create policy work_order_paint_specs_all on public.work_order_paint_specs
for all to authenticated
using (user_id = auth.uid())
with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.work_orders
    where estimate_id = work_order_paint_specs.estimate_id and user_id = auth.uid()
  )
);

create policy work_order_checklist_all on public.work_order_checklist
for all to authenticated
using (user_id = auth.uid())
with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.work_orders
    where estimate_id = work_order_checklist.estimate_id and user_id = auth.uid()
  )
);

create policy site_photos_all on public.site_photos
for all to authenticated
using (user_id = auth.uid())
with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.work_orders
    where estimate_id = site_photos.estimate_id and user_id = auth.uid()
  )
);

grant select, insert, update, delete on public.work_orders to authenticated;
grant select, insert, update, delete on public.work_order_paint_specs to authenticated;
grant select, insert, update, delete on public.work_order_checklist to authenticated;
grant select, insert, update, delete on public.site_photos to authenticated;

insert into storage.buckets (id, name, public)
values ('site-photos', 'site-photos', false)
on conflict (id) do nothing;

create policy site_photos_storage_select on storage.objects
for select to authenticated
using (
  bucket_id = 'site-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy site_photos_storage_insert on storage.objects
for insert to authenticated
with check (
  bucket_id = 'site-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy site_photos_storage_delete on storage.objects
for delete to authenticated
using (
  bucket_id = 'site-photos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create or replace view public.estimate_board
with (security_invoker = true) as
select
  e.id,
  e.user_id,
  e.title,
  e.job_address,
  e.square_feet,
  e.wall_count,
  e.trim_linear_feet,
  e.coat_count,
  e.total_price,
  e.labor_hours,
  e.gallons,
  e.scheduled_on,
  e.updated_at,
  c.name as client_name,
  s.slug as stage_slug,
  s.name as stage_name,
  s.sort_order as stage_sort,
  e.cabinet_doors
from public.estimates e
join public.clients c on c.id = e.client_id
join public.pipeline_stages s on s.id = e.stage_id;
