-- Trial and subscription live on the painter's profile. Billing webhooks are the only writer.

alter table public.profiles
  add column if not exists subscription_status text not null default 'trialing',
  add column if not exists trial_ends_at timestamptz not null default (now() + interval '14 days');

alter table public.profiles
  drop constraint if exists profiles_subscription_status_check;

alter table public.profiles
  add constraint profiles_subscription_status_check
  check (subscription_status in ('trialing', 'active', 'canceled'));

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
  insert into public.profiles (user_id, subscription_status, trial_ends_at)
  values (new.id, 'trialing', now() + interval '14 days');
  return new;
end;
$$;

-- A signed-in painter can edit the company name. They cannot mark their own subscription active.
create or replace function public.protect_subscription_columns()
returns trigger
language plpgsql
as $$
begin
  if new.subscription_status is not distinct from old.subscription_status
     and new.trial_ends_at is not distinct from old.trial_ends_at then
    return new;
  end if;
  if coalesce(auth.role(), '') = 'service_role'
     or current_user in ('postgres', 'supabase_admin', 'service_role') then
    return new;
  end if;
  raise exception 'subscription status is updated from billing';
end;
$$;

drop trigger if exists profiles_protect_subscription on public.profiles;

create trigger profiles_protect_subscription
before update on public.profiles
for each row execute function public.protect_subscription_columns();
