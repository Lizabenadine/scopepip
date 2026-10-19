-- Crew leads, dispatch status, and the start date on a work order.
-- Assigning a crew writes scheduled_start_date, assigned_crew_id, and status,
-- then records a crew notification. work_orders is published for realtime.

create table public.crews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(btrim(name)) > 0),
  phone text not null default '',
  color text not null default '#dbeafe',
  created_at timestamptz not null default now()
);

create index crews_user_idx on public.crews (user_id, name);

alter table public.work_orders
  add column status text not null default 'unscheduled'
    check (status in ('unscheduled', 'scheduled', 'in_progress', 'complete')),
  add column assigned_crew_id uuid references public.crews (id) on delete set null,
  add column scheduled_start_date date,
  add column notified_at timestamptz;

create index work_orders_schedule_idx
  on public.work_orders (user_id, scheduled_start_date, status);

create table public.crew_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  estimate_id uuid not null references public.estimates (id) on delete cascade,
  crew_id uuid references public.crews (id) on delete set null,
  message text not null,
  created_at timestamptz not null default now()
);

create index crew_notifications_estimate_idx
  on public.crew_notifications (estimate_id, created_at desc);

alter table public.crews enable row level security;
alter table public.crew_notifications enable row level security;

create policy crews_all on public.crews
for all to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy crew_notifications_select on public.crew_notifications
for select to authenticated
using (user_id = auth.uid());

grant select, insert, update, delete on public.crews to authenticated;
grant select on public.crew_notifications to authenticated;

alter table public.work_orders replica identity full;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin
      alter publication supabase_realtime add table public.work_orders;
    exception
      when duplicate_object then null;
    end;
    begin
      alter publication supabase_realtime add table public.crew_notifications;
    exception
      when duplicate_object then null;
    end;
  end if;
end $$;

create or replace function public.assign_work_order(
  target_estimate_id uuid,
  target_crew_id uuid,
  start_date date,
  next_status text
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  target_user uuid;
  target_note text;
  target_status text;
  target_payment text;
  target_stage_slug text;
  target_title text;
  client_name text;
  previous_crew uuid;
  crew_name text;
  crew_phone text;
  scheduled_stage uuid;
  completed_stage uuid;
  sent_stage uuid;
  next_stage uuid;
  next_date date;
  message text;
begin
  if next_status not in ('unscheduled', 'scheduled', 'in_progress', 'complete') then
    raise exception 'That dispatch column is not on the board.';
  end if;
  if auth.uid() is null then
    raise exception 'Sign in to dispatch a crew.';
  end if;

  select
    estimates.user_id,
    estimates.crew_note,
    estimates.client_status,
    estimates.payment_status,
    estimates.title,
    pipeline_stages.slug,
    clients.name
  into
    target_user,
    target_note,
    target_status,
    target_payment,
    target_title,
    target_stage_slug,
    client_name
  from public.estimates
  join public.pipeline_stages on pipeline_stages.id = estimates.stage_id
  join public.clients on clients.id = estimates.client_id
  where estimates.id = target_estimate_id
  for update;

  if target_user is null or target_user is distinct from auth.uid() then
    raise exception 'This job is not on file.';
  end if;
  if target_status is distinct from 'accepted'
     and target_payment is distinct from 'deposit_paid'
     and target_stage_slug not in ('scheduled', 'completed') then
    raise exception 'Accept the proposal before dispatching the crew.';
  end if;

  if next_status = 'unscheduled' then
    target_crew_id := null;
    start_date := null;
  elsif start_date is null then
    raise exception 'Pick a start date.';
  end if;

  if target_crew_id is not null and not exists (
    select 1 from public.crews
    where id = target_crew_id and user_id = target_user
  ) then
    raise exception 'That crew lead is not on the board.';
  end if;

  select assigned_crew_id into previous_crew
  from public.work_orders
  where estimate_id = target_estimate_id;

  insert into public.work_orders (
    estimate_id,
    user_id,
    prep_notes,
    status,
    assigned_crew_id,
    scheduled_start_date,
    notified_at
  )
  values (
    target_estimate_id,
    target_user,
    coalesce(target_note, ''),
    next_status,
    target_crew_id,
    start_date,
    case when target_crew_id is null then null else now() end
  )
  on conflict (estimate_id) do update set
    status = excluded.status,
    assigned_crew_id = excluded.assigned_crew_id,
    scheduled_start_date = excluded.scheduled_start_date,
    notified_at = case
      when excluded.assigned_crew_id is not null
        and work_orders.assigned_crew_id is distinct from excluded.assigned_crew_id
      then now()
      when excluded.status = 'unscheduled' then null
      else work_orders.notified_at
    end;

  select id into scheduled_stage
  from public.pipeline_stages
  where user_id = target_user and slug = 'scheduled';
  select id into completed_stage
  from public.pipeline_stages
  where user_id = target_user and slug = 'completed';
  select id into sent_stage
  from public.pipeline_stages
  where user_id = target_user and slug = 'estimate_sent';

  if next_status = 'complete' then
    next_stage := completed_stage;
    next_date := start_date;
  elsif next_status in ('scheduled', 'in_progress') then
    next_stage := scheduled_stage;
    next_date := start_date;
  else
    next_stage := sent_stage;
    next_date := null;
  end if;

  update public.estimates
  set
    stage_id = coalesce(next_stage, stage_id),
    scheduled_on = next_date,
    updated_at = now()
  where id = target_estimate_id;

  if target_crew_id is not null and target_crew_id is distinct from previous_crew then
    select name, phone into crew_name, crew_phone
    from public.crews
    where id = target_crew_id;
    message := crew_name || ' notified'
      || case when crew_phone <> '' then ' at ' || crew_phone else '' end
      || ' for ' || target_title || ' on ' || to_char(start_date, 'Dy, Mon FMDD') || '.';
    insert into public.crew_notifications (user_id, estimate_id, crew_id, message)
    values (target_user, target_estimate_id, target_crew_id, message);
    return message;
  end if;

  if next_status = 'unscheduled' then
    return coalesce(client_name, 'This job') || ' is back in Unscheduled.';
  elsif next_status = 'in_progress' then
    return coalesce(client_name, 'This job') || ' is in progress.';
  elsif next_status = 'complete' then
    return coalesce(client_name, 'This job') || ' is marked complete.';
  end if;
  return coalesce(client_name, 'This job') || ' is scheduled for ' || to_char(start_date, 'Dy, Mon FMDD') || '.';
end;
$$;

revoke all on function public.assign_work_order(uuid, uuid, date, text) from public;
grant execute on function public.assign_work_order(uuid, uuid, date, text) to authenticated;
