-- Signed change orders. The estimate total still comes from the app pricer.

create table public.change_orders (
  id text primary key,
  estimate_id uuid not null references public.estimates (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  items jsonb not null,
  subtotal numeric(12, 2) not null check (subtotal >= 0),
  client_signature_url text not null,
  created_at timestamptz not null default now()
);

alter table public.change_orders enable row level security;

create policy change_orders_all on public.change_orders
for all to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

grant select, insert on public.change_orders to authenticated;
