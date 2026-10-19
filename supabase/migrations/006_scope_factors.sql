-- Prep, access, coat schedules, tax basis, and the minimum job charge.

alter table public.estimates
  add column tax_basis text not null default 'total_job'
    check (tax_basis in ('materials_only', 'total_job')),
  add column minimum_job_charge numeric(12, 2) not null default 350;

alter table public.estimate_areas
  add column prep_level text not null default 'none'
    check (prep_level in ('none', 'light', 'medium', 'heavy')),
  add column prep_hours numeric(8, 3),
  add column access_factor numeric(6, 3) not null default 1;

alter table public.estimate_surfaces
  add column primer_coats integer not null default 0,
  add column finish_coats integer;

alter table public.production_rates
  add column primer_rate numeric(12, 4) not null default 0,
  add column primer_coverage_per_coat numeric(12, 4) not null default 0;
