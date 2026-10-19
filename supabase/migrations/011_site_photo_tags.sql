-- Site photo tags. A photo can point at a room, a line item, or the prep note.

alter table public.site_photos
  add column tag text not null default 'in_progress'
    check (tag in ('before', 'in_progress', 'after', 'prep_concern', 'touch_up')),
  add column link_kind text
    check (link_kind is null or link_kind in ('area', 'line', 'prep')),
  add column link_id text;

create index site_photos_tag_idx on public.site_photos (estimate_id, tag, created_at desc);
