-- VINI CAR RENTAL: seed the standard vehicle types used by the admin form.
-- Run once in Supabase SQL Editor. Existing category rows are preserved.
-- Only authenticated VINI administrators may create custom vehicle types.

grant insert on table public.categories to authenticated;
drop policy if exists vini_admin_insert_categories on public.categories;
create policy vini_admin_insert_categories
on public.categories
for insert
to authenticated
with check (public.is_admin());

insert into public.categories (name, slug, is_active)
values
  ('SUV', 'suv', true),
  ('Hatchback', 'hatchback', true),
  ('Sedan', 'sedan', true),
  ('Sports', 'sports', true),
  ('Van', 'van', true),
  ('MUV / MPV', 'muv-mpv', true),
  ('Luxury', 'luxury', true),
  ('Convertible', 'convertible', true),
  ('Coupe', 'coupe', true),
  ('Electric', 'electric', true),
  ('Pickup', 'pickup', true)
on conflict (slug) do update
set name = excluded.name,
    is_active = true;
