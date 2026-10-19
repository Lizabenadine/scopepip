-- PaintScout-style areas, coat rates, and invoice payment methods.
-- A coat-box value is the production rate for that many full coats.
-- Gallons = quantity × coats ÷ one-coat coverage, or items × gal/item × coats.

create table public.production_rates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  category text not null,
  internal_label text not null,
  client_label text not null,
  basis text not null check (
    basis in (
      'sqft_per_hour',
      'lnft_per_hour',
      'hours_per_item',
      'dollars_per_sqft',
      'dollars_per_lnft',
      'dollars_per_item'
    )
  ),
  measure text not null check (measure in ('walls', 'ceiling', 'trim', 'items')),
  coverage_per_coat numeric(12, 4) not null default 0,
  product_name text not null default '',
  product_cost_per_gallon numeric(12, 2) not null default 0,
  client_description text not null default '',
  crew_note text not null default '',
  hide_from_customer boolean not null default false,
  show_coats boolean not null default true,
  show_price boolean not null default false,
  custom_hourly_rate numeric(12, 2),
  sort_order integer not null default 0
);

create table public.production_rate_coats (
  id uuid primary key default gen_random_uuid(),
  rate_id uuid not null references public.production_rates (id) on delete cascade,
  coats integer not null check (coats between 1 and 6),
  rate_value numeric(12, 4) not null,
  unique (rate_id, coats)
);

create table public.estimate_areas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  estimate_id uuid not null references public.estimates (id) on delete cascade,
  name text not null,
  area_type text not null check (area_type in ('room', 'surface')),
  length_ft numeric(10, 2) not null default 0,
  width_ft numeric(10, 2) not null default 0,
  height_ft numeric(10, 2) not null default 0,
  crew_note text not null default '',
  sort_order integer not null default 0
);

create table public.estimate_surfaces (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  area_id uuid not null references public.estimate_areas (id) on delete cascade,
  rate_id uuid references public.production_rates (id),
  coat_count integer not null default 2,
  item_count numeric(10, 2) not null default 0,
  quantity_override numeric(12, 2),
  crew_note text not null default ''
);

create table public.payment_methods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  label text not null,
  surcharge_percent numeric(6, 3) not null default 0
);

alter table public.estimates
  add column hourly_rate numeric(12, 2) not null default 67,
  add column hour_rounding numeric(4, 2) not null default 0.5,
  add column tax_percent numeric(6, 3) not null default 0,
  add column discount_kind text not null default 'percent',
  add column discount_value numeric(12, 2) not null default 0,
  add column surcharge_percent numeric(6, 3) not null default 0,
  add column expiry_days integer not null default 0,
  add column crew_note text not null default '',
  add column accepted_at timestamptz;

alter table public.work_orders
  add column hour_display text not null default 'all'
  check (hour_display in ('all', 'hide-item', 'hide-all'));
