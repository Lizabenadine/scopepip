-- Migration 022: Support lifetime subscription status and super_admin role for permanent access
-- 1. Expands public.profiles subscription_status check constraint to include 'lifetime'
alter table public.profiles
  drop constraint if exists profiles_subscription_status_check;

alter table public.profiles
  add constraint profiles_subscription_status_check
  check (subscription_status in ('trialing', 'active', 'canceled', 'lifetime'));

-- 2. Add role column to profiles if not present, and constrain to valid roles
alter table public.profiles
  add column if not exists role text not null default 'owner';

alter table public.profiles
  drop constraint if exists profiles_role_check;

alter table public.profiles
  add constraint profiles_role_check
  check (role in ('super_admin', 'owner', 'project_manager', 'estimator'));

-- 3. Upgrade founder's existing account to super_admin and lifetime access in public.profiles
update public.profiles
set subscription_status = 'lifetime',
    role = 'super_admin'
where user_id in (
  select id from auth.users where lower(email) = 'nadieshda@aol.com'
);
