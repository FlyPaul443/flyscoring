-- Fly Club: event types and shooter classes.
-- Run ONCE in Supabase > SQL Editor. Safe on existing data:
-- every event already entered becomes a Club shoot, every entry becomes CF.

alter table events add column if not exists match_type text not null default 'club';
alter table events drop constraint if exists events_match_type_check;
alter table events add constraint events_match_type_check
  check (match_type in ('club', 'state', 'registered'));

alter table entries add column if not exists shoot_class text not null default 'CF';
alter table entries drop constraint if exists entries_shoot_class_check;
alter table entries add constraint entries_shoot_class_check
  check (shoot_class in ('RF', 'CF', 'LG', 'HG'));

-- A member may shoot more than one class in an event (one entry per class).
alter table entries drop constraint if exists entries_event_id_member_id_key;
alter table entries drop constraint if exists entries_event_member_class_key;
alter table entries add constraint entries_event_member_class_key
  unique (event_id, member_id, shoot_class);

-- Class must suit the event type.
create or replace function check_entry_class() returns trigger language plpgsql as $$
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

drop trigger if exists entries_check_class on entries;
create trigger entries_check_class
before insert or update on entries
for each row execute function check_entry_class();

-- Rebuild the result views, now split by class.
drop view if exists season_ranking;
drop view if exists event_results;

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

grant select on event_results, season_ranking to anon, authenticated;
