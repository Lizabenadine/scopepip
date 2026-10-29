-- Short clips attached to a proposal line.
-- The office uploads with the service role. The customer streams the public object.
-- Anonymous clients cannot upload. The app also refuses a file over 40 MB.

insert into storage.buckets (id, name, public)
values ('line-videos', 'line-videos', true)
on conflict (id) do update set public = true;
