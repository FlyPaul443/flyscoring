"use client";
import { useEffect, useState } from "react";
import { supabase, EventRow } from "@/lib/supabase";
import Logo from "../Logo";
import { CLASS_ORDER, MATCH_NAMES, className } from "@/lib/classes";

type Season = { id: number; name: string; start_date: string; end_date: string };

type Ranking = {
  shoot_class: string;
  position: number;
  member_id: number;
  name: string;
  events_shot: number;
  total_flys: number;
  total_score: number;
  total_group: number;
  total_points: number;
};

type Result = {
  shoot_class: string;
  position: number;
  name: string;
  detail: number;
  bay: string;
  total_score: number;
  total_group: number;
  total_points: number;
  total_flys: number;
};

const fmt = (d: string) => new Date(d + "T00:00:00").toLocaleDateString("en-AU");
const scroll = { overflowX: "auto" as const };

// Public page: no login needed. Read-only championship and weekly (event) scores.
export default function PublicResults() {
  const [tab, setTab] = useState<"championship" | "weekly">("championship");

  const [seasons, setSeasons] = useState<Season[]>([]);
  const [seasonId, setSeasonId] = useState<number | null>(null);
  const [ranking, setRanking] = useState<Ranking[]>([]);

  const [events, setEvents] = useState<EventRow[]>([]);
  const [eventId, setEventId] = useState<number | null>(null);
  const [results, setResults] = useState<Result[]>([]);

  const [error, setError] = useState("");

  // Seasons and events lists
  useEffect(() => {
    (async () => {
      const [s, e] = await Promise.all([
        supabase.from("seasons").select("*").order("start_date", { ascending: false }),
        supabase.from("events").select("*").order("event_date", { ascending: false }),
      ]);
      if (s.error || e.error) {
        setError("Results are not available right now. Please try again later.");
        return;
      }
      const sl = (s.data as Season[]) || [];
      const el = (e.data as EventRow[]) || [];
      setSeasons(sl);
      setEvents(el);
      // Default to the season containing today, otherwise the latest; latest event.
      const today = new Date().toISOString().slice(0, 10);
      const current = sl.find((x) => x.start_date <= today && today <= x.end_date);
      setSeasonId((current || sl[0])?.id ?? null);
      setEventId(el[0]?.id ?? null);
    })();
  }, []);

  useEffect(() => {
    if (seasonId === null) return setRanking([]);
    supabase
      .from("season_ranking")
      .select("*")
      .eq("season_id", seasonId)
      .order("shoot_class")
      .order("position")
      .then(({ data }) => setRanking((data as Ranking[]) || []));
  }, [seasonId]);

  useEffect(() => {
    if (eventId === null) return setResults([]);
    supabase
      .from("event_results")
      .select("*")
      .eq("event_id", eventId)
      .order("shoot_class")
      .order("position")
      .then(({ data }) => setResults((data as Result[]) || []));
  }, [eventId]);

  const season = seasons.find((s) => s.id === seasonId);

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 12 }}>
        <Logo size={84} />
        <h1 style={{ margin: 0 }}>Fly Club results</h1>
      </div>
      {error && <p className="error">{error}</p>}

      <div className="row">
        <button type="button" className={tab === "championship" ? "" : "secondary"} onClick={() => setTab("championship")}>
          Championship
        </button>
        <button type="button" className={tab === "weekly" ? "" : "secondary"} onClick={() => setTab("weekly")}>
          Weekly scores
        </button>
      </div>

      {tab === "championship" && (
        <>
          <div className="row">
            <select value={seasonId ?? ""} onChange={(e) => setSeasonId(Number(e.target.value))} aria-label="Season">
              {seasons.length === 0 && <option value="">No seasons yet</option>}
              {seasons.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            {season && (
              <span className="muted">
                {fmt(season.start_date)} to {fmt(season.end_date)} · club shoots only · ranked by total flys, then Total Score
              </span>
            )}
          </div>
          {CLASS_ORDER.filter((c) => ranking.some((r) => r.shoot_class === c)).map((c) => (
            <section key={c}>
              <h2>{className(c)}</h2>
          <div style={scroll}>
            <table>
              <thead>
                <tr>
                  <th>#</th><th>Name</th>
                  <th className="num">Events</th>
                  <th className="num">Flys</th>
                  <th className="num">Score</th>
                  <th className="num">Group</th>
                  <th className="num">Total Score</th>
                </tr>
              </thead>
              <tbody>
                {ranking.filter((r) => r.shoot_class === c).map((r) => (
                  <tr key={r.member_id}>
                    <td>{r.position}</td>
                    <td>{r.name}</td>
                    <td className="num">{r.events_shot}</td>
                    <td className="num">{r.total_flys}</td>
                    <td className="num">{r.total_score}</td>
                    <td className="num">{r.total_group}</td>
                    <td className="num"><strong>{r.total_points}</strong></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
            </section>
          ))}
          {ranking.length === 0 && <p className="muted">No scores in this season yet.</p>}
        </>
      )}

      {tab === "weekly" && (
        <>
          <div className="row">
            <select value={eventId ?? ""} onChange={(e) => setEventId(Number(e.target.value))} aria-label="Event">
              {events.length === 0 && <option value="">No events yet</option>}
              {events.map((ev) => (
                <option key={ev.id} value={ev.id}>{fmt(ev.event_date)} · {ev.description}{ev.match_type && ev.match_type !== "club" ? ` (${MATCH_NAMES[ev.match_type]})` : ""}</option>
              ))}
            </select>
            <span className="muted">ranked by Total Score, then flys</span>
          </div>
          {CLASS_ORDER.filter((c) => results.some((r) => r.shoot_class === c)).map((c) => (
            <section key={c}>
              <h2>{className(c)}</h2>
          <div style={scroll}>
            <table>
              <thead>
                <tr>
                  <th>#</th><th>Name</th><th>Detail</th><th>Bay</th>
                  <th className="num">Score</th>
                  <th className="num">Group</th>
                  <th className="num">Total Score</th>
                  <th className="num">Flys</th>
                </tr>
              </thead>
              <tbody>
                {results.filter((r) => r.shoot_class === c).map((r, i) => (
                  <tr key={i}>
                    <td>{r.position}</td><td>{r.name}</td><td>{r.detail}</td><td>{r.bay}</td>
                    <td className="num">{r.total_score}</td>
                    <td className="num">{r.total_group}</td>
                    <td className="num"><strong>{r.total_points}</strong></td>
                    <td className="num">{r.total_flys}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
            </section>
          ))}
          {results.length === 0 && <p className="muted">No scores for this event yet.</p>}
        </>
      )}
    </>
  );
}
