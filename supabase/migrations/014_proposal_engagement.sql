-- Client opens and section views on a public proposal. Anon writes go through record_proposal_event.

create table public.proposal_events (
  id uuid primary key default gen_random_uuid(),
  estimate_id uuid not null references public.estimates (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  event_type text not null check (event_type in ('open', 'view_section', 'revisit')),
  section_name text,
  user_agent text not null default '',
  created_at timestamptz not null default now()
);

alter table public.proposal_events enable row level security;

create policy proposal_events_select on public.proposal_events
for select to authenticated
using (user_id = auth.uid());

grant select on public.proposal_events to authenticated;

create or replace function public.record_proposal_event(
  proposal_id text,
  event_type text,
  section_name text,
  user_agent text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_id uuid;
  target_user uuid;
begin
  if proposal_id is null or length(trim(proposal_id)) = 0 then
    raise exception 'This proposal link is not valid.';
  end if;
  if event_type not in ('open', 'view_section', 'revisit') then
    raise exception 'That proposal event is not tracked.';
  end if;

  select id, user_id
    into target_id, target_user
  from public.estimates
  where public_token = proposal_id
     or id::text = proposal_id
  limit 1;

  if target_id is null then
    return;
  end if;

  insert into public.proposal_events (estimate_id, user_id, event_type, section_name, user_agent)
  values (
    target_id,
    target_user,
    event_type,
    nullif(left(btrim(coalesce(section_name, '')), 80), ''),
    left(coalesce(user_agent, 'unknown'), 400)
  );
end;
$$;

revoke all on function public.record_proposal_event(text, text, text, text) from public;
grant execute on function public.record_proposal_event(text, text, text, text) to anon, authenticated;
