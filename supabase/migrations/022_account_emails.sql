-- One normalized email owns one account. Existing office records stay in the accounts file.
-- This table starts empty, so applying it does not delete or rewrite any account.

create table if not exists public.account_emails (
  email text primary key,
  user_id text not null,
  created_at timestamptz not null default now(),
  constraint account_emails_is_normalized check (
    email = lower(btrim(email))
    and position('@' in email) > 1
  )
);

alter table public.account_emails enable row level security;

revoke all on table public.account_emails from anon, authenticated;
