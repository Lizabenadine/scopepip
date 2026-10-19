-- Crew snapshot of a scheduled estimate.
-- Hours, dimensions, prep, and paint specs only. Rates, costs, and totals stay on estimates.

alter table public.work_orders
  add column allocated_hours numeric(8, 3) not null default 0;

alter table public.production_rates
  drop constraint if exists production_rates_measure_check;

alter table public.production_rates
  add constraint production_rates_measure_check
  check (measure in (
    'walls',
    'ceiling',
    'trim',
    'items',
    'siding',
    'fascia',
    'soffit',
    'shutters',
    'deck',
    'crown',
    'wainscot',
    'accent'
  ));

create table public.work_order_areas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  estimate_id uuid not null references public.work_orders (estimate_id) on delete cascade,
  name text not null,
  dimension_label text not null default '',
  prep_level text not null default 'none'
    check (prep_level in ('none', 'light', 'medium', 'heavy')),
  prep_notes text not null default '',
  access_factor numeric(6, 3) not null default 1,
  allocated_hours numeric(8, 3) not null default 0,
  sort_order integer not null default 0
);

create table public.work_order_surfaces (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  area_id uuid not null references public.work_order_areas (id) on delete cascade,
  label text not null,
  quantity_label text not null default '',
  primer_coats integer not null default 0,
  finish_coats integer not null default 0,
  product_name text not null default '',
  paint_gallons numeric(8, 3) not null default 0,
  allocated_hours numeric(8, 3) not null default 0,
  crew_note text not null default '',
  sort_order integer not null default 0
);

create index work_order_areas_estimate_idx
  on public.work_order_areas (estimate_id, sort_order);
create index work_order_surfaces_area_idx
  on public.work_order_surfaces (area_id, sort_order);

alter table public.work_order_areas enable row level security;
alter table public.work_order_surfaces enable row level security;

create policy work_order_areas_all on public.work_order_areas
for all to authenticated
using (user_id = auth.uid())
with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.work_orders
    where estimate_id = work_order_areas.estimate_id and user_id = auth.uid()
  )
);

create policy work_order_surfaces_all on public.work_order_surfaces
for all to authenticated
using (user_id = auth.uid())
with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.work_order_areas
    where id = work_order_surfaces.area_id and user_id = auth.uid()
  )
);

grant select, insert, update, delete on public.work_order_areas to authenticated;
grant select, insert, update, delete on public.work_order_surfaces to authenticated;
