-- Upgrade for an existing database: public results page (no login needed).
-- Run once in the Supabase SQL editor. No data is changed or lost.
--
-- What becomes public: the event list (date and description), the season list,
-- and the two result views (first name + initial, bay, scores and totals).
-- What stays private (login required): the members table (membership numbers),
-- entries and the individual score rows. Only signed-in users can change anything.

drop policy if exists "public read seasons" on seasons;
drop policy if exists "public read events"  on events;
create policy "public read seasons" on seasons for select to anon using (true);
create policy "public read events"  on events  for select to anon using (true);

-- The result views run with their owner's rights, so they can total the scores
-- for visitors who aren't signed in.
alter view event_results  set (security_invoker = false);
alter view season_ranking set (security_invoker = false);

grant select on event_results, season_ranking to anon, authenticated;
