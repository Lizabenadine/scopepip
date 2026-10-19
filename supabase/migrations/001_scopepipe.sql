-- ScopePipe production schema
-- Tenant key is auth.uid(). The app (lib/estimate/calculate.ts) is the only
-- pricer: it writes gallons, hours, and money snapshots, and replaces
-- line_items from materializeLineItems() in the same save.

create extension if not exists pgcrypto;

create type public.line_source as enum ('walls', 'trim', 'custom');
create type public.line_kind as enum ('material', 'labor');

create table public.pipeline_stages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  slug text not null check (
    slug in ('lead', 'estimate_sent', 'scheduled', 'completed')
  ),
  name text not null,
  sort_order integer not null,
  created_at timestamptz not null default now(),
  unique (user_id, slug)
);

create table public.rate_cards (
  user_id uuid primary key references auth.users (id) on delete cascade,
  wall_sqft_per_hour numeric(10, 2) not null default 180 check (wall_sqft_per_hour > 0),
  minutes_per_wall numeric(8, 2) not null default 8 check (minutes_per_wall >= 0),
  trim_lf_per_hour numeric(10, 2) not null default 28 check (trim_lf_per_hour > 0),
  wall_sqft_per_gallon numeric(10, 2) not null default 350 check (wall_sqft_per_gallon > 0),
  trim_lf_per_gallon numeric(10, 2) not null default 350 check (trim_lf_per_gallon > 0),
  material_cost_per_gallon numeric(10, 2) not null default 52 check (material_cost_per_gallon >= 0),
  labor_cost_per_hour numeric(10, 2) not null default 58 check (labor_cost_per_hour >= 0),
  material_margin numeric(5, 4) not null default 0.3000 check (
    material_margin >= 0 and material_margin <= 0.9000
  ),
  labor_margin numeric(5, 4) not null default 0.4500 check (
    labor_margin >= 0 and labor_margin <= 0.9000
  ),
  updated_at timestamptz not null default now()
);

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(btrim(name)) > 0),
  phone text not null default '',
  email text not null default '',
  address text not null default '',
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.estimates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  client_id uuid not null references public.clients (id) on delete restrict,
  stage_id uuid not null references public.pipeline_stages (id) on delete restrict,
  title text not null,
  job_address text not null default '',
  square_feet numeric(12, 2) not null default 0 check (square_feet >= 0),
  wall_count integer not null default 0 check (wall_count >= 0),
  trim_linear_feet numeric(12, 2) not null default 0 check (trim_linear_feet >= 0),
  coat_count integer not null default 2 check (coat_count between 1 and 6),
  wall_sqft_per_hour numeric(10, 2) not null check (wall_sqft_per_hour > 0),
  minutes_per_wall numeric(8, 2) not null check (minutes_per_wall >= 0),
  trim_lf_per_hour numeric(10, 2) not null check (trim_lf_per_hour > 0),
  wall_sqft_per_gallon numeric(10, 2) not null check (wall_sqft_per_gallon > 0),
  trim_lf_per_gallon numeric(10, 2) not null check (trim_lf_per_gallon > 0),
  material_cost_per_gallon numeric(10, 2) not null check (material_cost_per_gallon >= 0),
  labor_cost_per_hour numeric(10, 2) not null check (labor_cost_per_hour >= 0),
  material_margin numeric(5, 4) not null check (
    material_margin >= 0 and material_margin <= 0.9000
  ),
  labor_margin numeric(5, 4) not null check (
    labor_margin >= 0 and labor_margin <= 0.9000
  ),
  gallons numeric(12, 3) not null default 0,
  labor_hours numeric(12, 3) not null default 0,
  material_cost numeric(12, 2) not null default 0,
  labor_cost numeric(12, 2) not null default 0,
  material_price numeric(12, 2) not null default 0,
  labor_price numeric(12, 2) not null default 0,
  total_price numeric(12, 2) not null default 0,
  scheduled_on date,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.line_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  estimate_id uuid not null references public.estimates (id) on delete cascade,
  sort_order integer not null default 0,
  source public.line_source not null,
  kind public.line_kind not null,
  description text not null,
  quantity numeric(12, 3) not null default 0 check (quantity >= 0),
  unit text not null,
  coats integer not null default 0 check (coats >= 0),
  unit_cost numeric(12, 2) not null default 0 check (unit_cost >= 0),
  margin numeric(5, 4) not null default 0 check (margin >= 0 and margin <= 0.9000),
  cost numeric(12, 2) not null default 0,
  price numeric(12, 2) not null default 0,
  created_at timestamptz not null default now()
);

create index clients_user_name_idx on public.clients (user_id, name);
create index estimates_user_stage_idx on public.estimates (user_id, stage_id);
create index estimates_client_idx on public.estimates (client_id);
create index line_items_estimate_idx on public.line_items (estimate_id, sort_order);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger clients_updated_at
before update on public.clients
for each row execute function public.set_updated_at();

create trigger estimates_updated_at
before update on public.estimates
for each row execute function public.set_updated_at();

create trigger rate_cards_updated_at
before update on public.rate_cards
for each row execute function public.set_updated_at();

-- New accounts start on the four-stage board with the default rate card.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.rate_cards (user_id) values (new.id);
  insert into public.pipeline_stages (user_id, slug, name, sort_order) values
    (new.id, 'lead', 'Lead', 0),
    (new.id, 'estimate_sent', 'Estimate Sent', 1),
    (new.id, 'scheduled', 'Scheduled', 2),
    (new.id, 'completed', 'Completed', 3);
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

alter table public.pipeline_stages enable row level security;
alter table public.rate_cards enable row level security;
alter table public.clients enable row level security;
alter table public.estimates enable row level security;
alter table public.line_items enable row level security;

create policy pipeline_stages_all on public.pipeline_stages
for all to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy rate_cards_all on public.rate_cards
for all to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy clients_all on public.clients
for all to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy estimates_select on public.estimates
for select to authenticated
using (user_id = auth.uid());

create policy estimates_insert on public.estimates
for insert to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.clients
    where id = client_id and user_id = auth.uid()
  )
  and exists (
    select 1 from public.pipeline_stages
    where id = stage_id and user_id = auth.uid()
  )
);

create policy estimates_update on public.estimates
for update to authenticated
using (user_id = auth.uid())
with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.clients
    where id = client_id and user_id = auth.uid()
  )
  and exists (
    select 1 from public.pipeline_stages
    where id = stage_id and user_id = auth.uid()
  )
);

create policy estimates_delete on public.estimates
for delete to authenticated
using (user_id = auth.uid());

create policy line_items_all on public.line_items
for all to authenticated
using (user_id = auth.uid())
with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.estimates
    where id = estimate_id and user_id = auth.uid()
  )
);

grant select, insert, update, delete on public.pipeline_stages to authenticated;
grant select, insert, update, delete on public.rate_cards to authenticated;
grant select, insert, update, delete on public.clients to authenticated;
grant select, insert, update, delete on public.estimates to authenticated;
grant select, insert, update, delete on public.line_items to authenticated;

-- Board query the pipeline view is built to match.
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
  s.sort_order as stage_sort
from public.estimates e
join public.clients c on c.id = e.client_id
join public.pipeline_stages s on s.id = e.stage_id;

grant select on public.estimate_board to authenticated;
