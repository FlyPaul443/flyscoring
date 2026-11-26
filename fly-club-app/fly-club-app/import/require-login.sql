-- Upgrade for an existing database: only signed-in users can read data.
-- Run once in the Supabase SQL editor. No data is changed.
-- (Without this, anyone with the site address could still read results.)

drop policy if exists "read seasons" on seasons;
drop policy if exists "read members" on members;
drop policy if exists "read events"  on events;
drop policy if exists "read bays"    on bays;
drop policy if exists "read entries" on entries;
drop policy if exists "read scores"  on scores;

create policy "read seasons" on seasons for select to authenticated using (true);
create policy "read members" on members for select to authenticated using (true);
create policy "read events"  on events  for select to authenticated using (true);
create policy "read bays"    on bays    for select to authenticated using (true);
create policy "read entries" on entries for select to authenticated using (true);
create policy "read scores"  on scores  for select to authenticated using (true);
