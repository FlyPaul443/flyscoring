-- Fly Club: bulk results import
-- Run this once in the Supabase SQL editor (after schema.sql).
--
-- How it works: you load a CSV into the staging table `import_results`
-- (Table Editor > import_results > Insert > Import data from CSV), then run
--     select process_import();
-- which creates any missing members and events, adds the entries and the five
-- cards per shooter, and empties the staging table. Totals are calculated
-- automatically. Re-running with the same shooters and events updates their
-- scores rather than duplicating them.
--
-- One row per shooter per event. Each of the five cards has a score, group
-- and flys (c1_score, c1_group, c1_flys ... c5_score, c5_group, c5_flys).

create table if not exists import_results (
  event_date         date,
  event_description  text,
  member_name        text,
  detail             int default 1,
  bay                text,
  c1_score numeric default 0, c1_group numeric default 0, c1_flys int default 0,
  c2_score numeric default 0, c2_group numeric default 0, c2_flys int default 0,
  c3_score numeric default 0, c3_group numeric default 0, c3_flys int default 0,
  c4_score numeric default 0, c4_group numeric default 0, c4_flys int default 0,
  c5_score numeric default 0, c5_group numeric default 0, c5_flys int default 0
);

-- Staging table is for admin use only (SQL editor / Table Editor).
alter table import_results enable row level security;

create or replace function process_import() returns text
language plpgsql as $$
declare
  n_members int;
  n_events int;
  n_entries int;
  n_cards int;
begin
  if exists (select 1 from import_results where event_date is null
             or coalesce(trim(event_description), '') = ''
             or coalesce(trim(member_name), '') = ''
             or coalesce(trim(bay), '') = '') then
    raise exception 'Every row needs event_date, event_description, member_name and bay.';
  end if;

  -- Members (matched on name, ignoring case and extra spaces)
  insert into members (name)
  select distinct on (lower(trim(member_name))) trim(member_name)
  from import_results r
  where not exists (
    select 1 from members m where lower(m.name) = lower(trim(r.member_name))
  );
  get diagnostics n_members = row_count;

  -- Events (matched on date + description)
  insert into events (event_date, description)
  select distinct on (event_date, lower(trim(event_description)))
         event_date, trim(event_description)
  from import_results r
  where not exists (
    select 1 from events e
    where e.event_date = r.event_date
      and lower(e.description) = lower(trim(r.event_description))
  );
  get diagnostics n_events = row_count;

  -- Entries (invalid bays fail here with a clear error and nothing is saved).
  -- The five blank cards for each new entry are created automatically.
  insert into entries (event_id, member_id, detail, bay)
  select e.id, m.id, coalesce(r.detail, 1), upper(trim(r.bay))
  from import_results r
  join events e  on e.event_date = r.event_date
                and lower(e.description) = lower(trim(r.event_description))
  join members m on lower(m.name) = lower(trim(r.member_name))
  on conflict do nothing;
  get diagnostics n_entries = row_count;

  -- Card scores (insert, or update if the card already exists)
  insert into scores (entry_id, card, score, group_score, flys)
  select en.id, v.card, coalesce(v.score, 0), coalesce(v.grp, 0), coalesce(v.flys, 0)
  from import_results r
  join events e  on e.event_date = r.event_date
                and lower(e.description) = lower(trim(r.event_description))
  join members m on lower(m.name) = lower(trim(r.member_name))
  join entries en on en.event_id = e.id and en.member_id = m.id
  cross join lateral (values
    (1, r.c1_score, r.c1_group, r.c1_flys),
    (2, r.c2_score, r.c2_group, r.c2_flys),
    (3, r.c3_score, r.c3_group, r.c3_flys),
    (4, r.c4_score, r.c4_group, r.c4_flys),
    (5, r.c5_score, r.c5_group, r.c5_flys)
  ) as v(card, score, grp, flys)
  on conflict (entry_id, card) do update set
    score = excluded.score,
    group_score = excluded.group_score,
    flys = excluded.flys;
  get diagnostics n_cards = row_count;

  delete from import_results;

  return format('Imported: %s new members, %s new events, %s new entries, %s cards saved.',
                n_members, n_events, n_entries, n_cards);
end;
$$;
