-- Material price is gallons × cost per gallon × (1 + material markup).

alter table public.estimates
  add column material_markup numeric(6, 4) not null default 0.20;
