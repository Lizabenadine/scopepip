-- Org profile for the signed-in painter. A blank company_name displays as ScopePipe.

create table public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  company_name text not null default '',
  company_email text not null default '',
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy profiles_select on public.profiles
for select to authenticated
using (user_id = auth.uid());

create policy profiles_insert on public.profiles
for insert to authenticated
with check (user_id = auth.uid());

create policy profiles_update on public.profiles
for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

grant select, insert, update on public.profiles to authenticated;

create trigger profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

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
  insert into public.profiles (user_id) values (new.id);
  return new;
end;
$$;

-- Public proposals read the owner's company name. Empty stays blank so the app uses ScopePipe.
create or replace function public.proposal_company_name(proposal_token text)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select btrim(coalesce(p.company_name, ''))
  from public.estimates e
  left join public.profiles p on p.user_id = e.user_id
  where e.public_token = proposal_token
  limit 1
$$;

revoke all on function public.proposal_company_name(text) from public;
grant execute on function public.proposal_company_name(text) to anon, authenticated;
