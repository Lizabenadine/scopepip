-- Outbound hooks. The service role reads active rows and posts the event.
-- Anonymous clients cannot list or insert URLs.

create table public.outbound_webhooks (
  id uuid primary key default gen_random_uuid(),
  company_id text not null,
  event text not null check (event ~ '^[a-z*][a-z0-9._*-]{0,79}$'),
  url text not null check (url ~ '^https://' and char_length(url) <= 500),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create index outbound_webhooks_active
  on public.outbound_webhooks (company_id, event)
  where active;

alter table public.outbound_webhooks enable row level security;
