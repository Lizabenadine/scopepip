-- Ensure scope text fields have no character caps.
-- Proposal area copy is estimate_areas.crew_note. Work order notes are
-- work_orders.prep_notes, work_order_areas.prep_notes, and work_order_surfaces.crew_note.

alter table public.estimate_areas
  alter column crew_note type text;

alter table public.estimate_surfaces
  alter column crew_note type text;

alter table public.estimates
  alter column notes type text,
  alter column crew_note type text;

alter table public.line_items
  alter column description type text,
  alter column client_note type text;

alter table public.work_orders
  alter column prep_notes type text;

alter table public.work_order_areas
  alter column prep_notes type text;

alter table public.work_order_surfaces
  alter column crew_note type text;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'proposal_areas'
      and column_name = 'description'
  ) then
    execute 'alter table public.proposal_areas alter column description type text';
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'work_order_items'
      and column_name = 'notes'
  ) then
    execute 'alter table public.work_order_items alter column notes type text';
  end if;
end
$$;
