-- Paddle customers and subscriptions. Webhooks are the only writer.

create table if not exists public.customers (
  customer_id text primary key,
  email text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists customers_email_idx on public.customers (email);

create table if not exists public.subscriptions (
  subscription_id text primary key,
  customer_id text not null references public.customers (customer_id),
  status text not null,
  price_id text not null,
  product_id text not null,
  scheduled_change_action text,
  scheduled_change_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.customers enable row level security;
alter table public.subscriptions enable row level security;

revoke all on table public.customers from anon, authenticated;
revoke all on table public.subscriptions from anon, authenticated;
