-- Add Line Item: custom, hourly, or quantity price, plus material rows.
-- A material row cost is quantity × unit price and is charged with the line price.
-- hidden_on_work_order keeps the line on the proposal and off the crew sheet.

alter table public.line_items
  add column pricing_mode text not null default 'custom'
    check (pricing_mode in ('hourly', 'quantity', 'custom')),
  add column work_order_hours numeric(8, 3) not null default 0 check (work_order_hours >= 0),
  add column hidden_on_work_order boolean not null default false,
  add column client_note text not null default '';

create table public.line_item_materials (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  line_item_id uuid not null references public.line_items (id) on delete cascade,
  sort_order integer not null default 0,
  name text not null,
  quantity numeric(12, 3) not null default 0 check (quantity >= 0),
  unit_price numeric(12, 2) not null default 0 check (unit_price >= 0),
  cost numeric(12, 2) not null default 0 check (cost >= 0)
);

create index line_item_materials_line_idx
  on public.line_item_materials (line_item_id, sort_order);

alter table public.line_item_materials enable row level security;

create policy line_item_materials_all on public.line_item_materials
for all to authenticated
using (user_id = auth.uid())
with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.line_items
    where id = line_item_materials.line_item_id and user_id = auth.uid()
  )
);

grant select, insert, update, delete on public.line_item_materials to authenticated;
