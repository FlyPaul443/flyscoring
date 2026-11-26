-- Upgrade for an existing database: adds Total Score (Score + Group).
-- Run once in the Supabase SQL editor. No data is changed or lost.

create or replace view event_results with (security_invoker = false) as
select
  e.event_id,
  rank() over (
    partition by e.event_id
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
group by e.event_id, e.id, m.id, m.name, e.detail, e.bay;

create or replace view season_ranking with (security_invoker = false) as
select
  sn.id as season_id,
  rank() over (
    partition by sn.id
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
group by sn.id, m.id, m.name;
