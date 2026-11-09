-- VINI CAR RENTAL: allow approved administrators to delete catalogue vehicles.
-- Run this once in Supabase SQL Editor after the base schema has been installed.
-- This grants no delete access to anonymous/public visitors.

begin;

grant delete on table public.vehicles to authenticated;

drop policy if exists vini_admin_delete_vehicles on public.vehicles;
create policy vini_admin_delete_vehicles
on public.vehicles
for delete
to authenticated
using (public.is_admin());

commit;
