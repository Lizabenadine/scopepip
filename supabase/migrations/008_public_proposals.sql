-- Public proposal links, optional add-ons, and client acceptance.
-- accept_proposal is the only anon write. It stores the signature and opens a work order.

alter table public.estimates
  add column public_token text,
  add column client_status text not null default 'draft'
    check (client_status in ('draft', 'sent', 'accepted')),
  add column signature_name text,
  add column signature_payload text,
  add column signed_at timestamptz;

create unique index estimates_public_token_idx
  on public.estimates (public_token)
  where public_token is not null;

alter table public.line_items
  add column optional boolean not null default false,
  add column client_selected boolean not null default true;

create or replace function public.accept_proposal(
  proposal_token text,
  signed_name text,
  signature_payload text,
  signed_at timestamptz,
  selected_line_ids text[]
)
returns timestamptz
language plpgsql
security definer
set search_path = public
as $$
declare
  target_id uuid;
  target_user uuid;
  target_note text;
begin
  if proposal_token is null or length(trim(proposal_token)) = 0 then
    raise exception 'This proposal link is not valid.';
  end if;
  if signed_name is null or length(trim(signed_name)) = 0 then
    raise exception 'Sign with your name.';
  end if;
  if signature_payload is null or length(signature_payload) = 0 then
    raise exception 'Add a signature.';
  end if;

  select id, user_id, crew_note
    into target_id, target_user, target_note
  from public.estimates
  where public_token = proposal_token
  for update;

  if target_id is null then
    raise exception 'This proposal link is not valid.';
  end if;

  if exists (
    select 1 from public.estimates
    where id = target_id and client_status = 'accepted'
  ) then
    raise exception 'This proposal is already accepted.';
  end if;

  update public.estimates
  set
    client_status = 'accepted',
    accepted_at = signed_at,
    signature_name = trim(signed_name),
    signature_payload = signature_payload,
    signed_at = signed_at,
    updated_at = signed_at
  where id = target_id;

  update public.line_items
  set client_selected = id::text = any(coalesce(selected_line_ids, array[]::text[]))
  where estimate_id = target_id
    and optional;

  insert into public.work_orders (estimate_id, user_id, prep_notes)
  values (target_id, target_user, coalesce(target_note, ''))
  on conflict (estimate_id) do nothing;

  return signed_at;
end;
$$;

revoke all on function public.accept_proposal(text, text, text, timestamptz, text[]) from public;
grant execute on function public.accept_proposal(text, text, text, timestamptz, text[]) to anon, authenticated;
