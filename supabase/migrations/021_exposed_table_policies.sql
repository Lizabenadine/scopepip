alter table public.area_surfaces enable row level security;
alter table public.invoices enable row level security;
alter table public.payments enable row level security;
alter table public.estimator_settings enable row level security;

create policy "Enable all for authenticated users"
  on public.area_surfaces
  for all
  using (auth.role() = 'authenticated');

create policy "Enable all for authenticated users"
  on public.invoices
  for all
  using (auth.role() = 'authenticated');

create policy "Enable all for authenticated users"
  on public.payments
  for all
  using (auth.role() = 'authenticated');

create policy "Enable all for authenticated users"
  on public.estimator_settings
  for all
  using (auth.role() = 'authenticated');
