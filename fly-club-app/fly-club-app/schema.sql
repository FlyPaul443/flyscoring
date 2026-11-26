-- Fly Club scoring app: Supabase schema

create table members (
  id serial primary key,
  name text not null,
  "Membership_Number" integer  -- shown next to the name when picking a shooter
);

create table events (
  id serial primary key,
  event_date date not null,
  description text not null,
  -- club = weekly club shoot (classes RF, CF). state / registered = State or
  -- Registered match (classes RF, LG, HG: centrefire splits into Light and Heavy Gun).
  match_type text not null default 'club' check (match_type in ('club', 'state', 'registered'))
);

-- Valid bays as marked on the range: 1A, 1B ... 10A, 10B
create table bays (
  code text primary key check (code ~ '^([1-9]|10)[AB]$')
);

insert into bays (code)
select n || s
from generate_series(1, 10) as n, unnest(array['A', 'B']) as s;

-- A shooter entered in an event, in a class, assigned to a detail and a bay.
-- Classes: RF Rimfire, CF Centrefire, LG Light Gun, HG Heavy Gun.
-- An event can run any number of details (1, 2, 3 ...); the same bay can be
-- used once in each detail. A member can shoot more than one class in an event
-- (one entry per class).
create table entries (
  id serial primary key,
  event_id int not null references events(id) on delete cascade,
  member_id int not null references members(id),
  shoot_class text not null default 'CF' check (shoot_class in ('RF', 'CF', 'LG', 'HG')),
  detail int not null default 1 check (detail >= 1),
  bay text not null references bays(code),
  unique (event_id, member_id, shoot_class),
  unique (event_id, detail, bay)
);

-- The class must suit the event type: club shoots use RF or CF; State and
-- Registered matches use RF, LG or HG.
create function check_entry_class() returns trigger language plpgsql as $$
declare mt text;
begin
  select match_type into mt from events where id = new.event_id;
  if mt = 'club' and new.shoot_class not in ('RF', 'CF') then
    raise exception 'Club shoots use RF or CF only (got %).', new.shoot_class;
  elsif mt in ('state', 'registered') and new.shoot_class not in ('RF', 'LG', 'HG') then
    raise exception 'State and Registered matches use RF, LG or HG only (got %).', new.shoot_class;
  end if;
  return new;
end;
$$;

create trigger entries_check_class
before insert or update on entries
for each row execute function check_entry_class();

-- Each shooter shoots five cards (targets 1-5). Every card has its own
-- score, group and flys. Totals are the sum across the five cards.
create table scores (
  id serial primary key,
  entry_id int not null references entries(id) on delete cascade,
  card int not null check (card between 1 and 5),
  score numeric not null default 0,
  group_score numeric not null default 0,
  flys int not null default 0,
  unique (entry_id, card)
);

-- Adding a shooter to an event automatically creates their five blank cards.
create function create_cards() returns trigger language plpgsql as $$
begin
  insert into scores (entry_id, card)
  select new.id, generate_series(1, 5);
  return new;
end;
$$;

create trigger entries_create_cards
after insert on entries
for each row execute function create_cards();

-- Results for one event: totals across the five cards. Total Score
-- (total_points) is Score + Group. Ranked within each class by Total Score,
-- then total flys.
-- (security_invoker = false: the view runs with its owner's rights, so the public
-- results page can show totals without exposing the underlying tables.)
create view event_results with (security_invoker = false) as
select
  e.event_id,
  e.shoot_class,
  rank() over (
    partition by e.event_id, e.shoot_class
    order by sum(s.score) + sum(s.group_score) desc, sum(s.flys) desc
  ) as position,
  m.id as member_id,
  m.name,
  e.detail,
  e.bay,
  sum(s.score) as total_score,
  sum(s.group_score) as total_group,
  sum(s.flys) as total_flys,
  sum(s.score) + sum(s.group_score) as total_points
from entries e
join members m on m.id = e.member_id
join scores s on s.entry_id = e.id
group by e.event_id, e.id, e.shoot_class, m.id, m.name, e.detail, e.bay;

-- Championship seasons, defined by a start and end date (inclusive),
-- e.g. 2025-11-01 to 2026-10-30. Seasons can't overlap.
create extension if not exists btree_gist;

create table seasons (
  id serial primary key,
  name text not null,
  start_date date not null,
  end_date date not null,
  check (end_date >= start_date),
  exclude using gist (daterange(start_date, end_date, '[]') with &&)
);

-- Season ranking: an event belongs to the season whose dates contain the
-- event date. Club shoots only (State and Registered matches are not counted).
-- Ranked separately for each class: most flys first, then highest Total Score
-- (Score + Group).
create view season_ranking with (security_invoker = false) as
select
  sn.id as season_id,
  e.shoot_class,
  rank() over (
    partition by sn.id, e.shoot_class
    order by sum(s.flys) desc, sum(s.score) + sum(s.group_score) desc
  ) as position,
  m.id as member_id,
  m.name,
  count(distinct e.id) as events_shot,
  sum(s.flys) as total_flys,
  sum(s.group_score) as total_group,
  sum(s.score) as total_score,
  sum(s.score) + sum(s.group_score) as total_points
from entries e
join events ev on ev.id = e.event_id
join seasons sn on ev.event_date between sn.start_date and sn.end_date
join members m on m.id = e.member_id
join scores s on s.entry_id = e.id
where ev.match_type = 'club'
group by sn.id, e.shoot_class, m.id, m.name;

-- Row level security: only signed-in users can read or write
alter table seasons enable row level security;
alter table members enable row level security;
alter table events  enable row level security;
alter table bays    enable row level security;
alter table entries enable row level security;
alter table scores  enable row level security;

create policy "read seasons" on seasons for select to authenticated using (true);
create policy "read members" on members for select to authenticated using (true);
create policy "read events"  on events  for select to authenticated using (true);
create policy "read bays"    on bays    for select to authenticated using (true);
create policy "read entries" on entries for select to authenticated using (true);
create policy "read scores"  on scores  for select to authenticated using (true);

-- Public (no login) can see the event list and season list only. Members, entries
-- and scores stay private; the public results page reads the two result views.
create policy "public read seasons" on seasons for select to anon using (true);
create policy "public read events"  on events  for select to anon using (true);

create policy "write seasons" on seasons for all to authenticated using (true) with check (true);
create policy "write members" on members for all to authenticated using (true) with check (true);
create policy "write events"  on events  for all to authenticated using (true) with check (true);
create policy "write entries" on entries for all to authenticated using (true) with check (true);
create policy "write scores"  on scores  for all to authenticated using (true) with check (true);

-- Let visitors who aren't signed in read the two result views.
grant select on event_results, season_ranking to anon, authenticated;
