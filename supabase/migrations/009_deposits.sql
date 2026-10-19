-- Deposit receipts. A succeeded PaymentIntent marks the job Deposit Paid / Scheduled
-- and opens a crew work order.

alter table public.estimates
  add column payment_status text not null default 'unpaid'
    check (payment_status in ('unpaid', 'deposit_paid')),
  add column deposit_percent numeric(5, 2) not null default 30
    check (deposit_percent between 20 and 50);

create table public.deposit_receipts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  estimate_id uuid not null references public.estimates (id) on delete cascade,
  payment_intent_id text not null unique,
  amount numeric(12, 2) not null check (amount > 0),
  currency text not null default 'usd',
  deposit_percent numeric(5, 2) not null check (deposit_percent between 20 and 50),
  method text not null check (method in ('card', 'apple_pay', 'google_pay')),
  paid_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index deposit_receipts_estimate_idx on public.deposit_receipts (estimate_id, paid_at desc);

alter table public.deposit_receipts enable row level security;

create policy deposit_receipts_select on public.deposit_receipts
for select to authenticated
using (user_id = auth.uid());

grant select on public.deposit_receipts to authenticated;

create or replace function public.record_deposit(
  target_estimate_id uuid,
  payment_intent_id text,
  amount numeric,
  deposit_percent numeric,
  method text,
  paid_at timestamptz
)
returns timestamptz
language plpgsql
security definer
set search_path = public
as $$
declare
  target_user uuid;
  target_note text;
  target_status text;
  scheduled_stage uuid;
begin
  if payment_intent_id is null or length(trim(payment_intent_id)) = 0 then
    raise exception 'Payment is missing.';
  end if;
  if method not in ('card', 'apple_pay', 'google_pay') then
    raise exception 'Unknown payment method.';
  end if;
  if deposit_percent < 20 or deposit_percent > 50 then
    raise exception 'Deposit must be between 20 and 50 percent.';
  end if;

  select user_id, crew_note, client_status
    into target_user, target_note, target_status
  from public.estimates
  where id = target_estimate_id
  for update;

  if target_user is null then
    raise exception 'This estimate is not on file.';
  end if;
  if target_status is distinct from 'accepted' then
    raise exception 'Accept the proposal before paying the deposit.';
  end if;

  if exists (
    select 1 from public.deposit_receipts
    where deposit_receipts.payment_intent_id = record_deposit.payment_intent_id
  ) then
    return paid_at;
  end if;

  if exists (
    select 1 from public.deposit_receipts
    where estimate_id = target_estimate_id
  ) then
    raise exception 'A deposit is already recorded.';
  end if;

  insert into public.deposit_receipts (
    user_id, estimate_id, payment_intent_id, amount, deposit_percent, method, paid_at
  ) values (
    target_user, target_estimate_id, payment_intent_id, amount, deposit_percent, method, paid_at
  );

  select id into scheduled_stage
  from public.pipeline_stages
  where user_id = target_user and slug = 'scheduled'
  limit 1;

  update public.estimates
  set
    payment_status = 'deposit_paid',
    deposit_percent = record_deposit.deposit_percent,
    stage_id = coalesce(scheduled_stage, stage_id),
    scheduled_on = coalesce(scheduled_on, paid_at::date),
    updated_at = paid_at
  where id = target_estimate_id
    and stage_id not in (
      select id from public.pipeline_stages
      where user_id = target_user and slug = 'completed'
    );

  update public.estimates
  set payment_status = 'deposit_paid', deposit_percent = record_deposit.deposit_percent, updated_at = paid_at
  where id = target_estimate_id and payment_status is distinct from 'deposit_paid';

  insert into public.work_orders (estimate_id, user_id, prep_notes)
  values (target_estimate_id, target_user, coalesce(target_note, ''))
  on conflict (estimate_id) do nothing;

  return paid_at;
end;
$$;

revoke all on function public.record_deposit(uuid, text, numeric, numeric, text, timestamptz) from public;
grant execute on function public.record_deposit(uuid, text, numeric, numeric, text, timestamptz) to anon, authenticated;
