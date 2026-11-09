"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAdmin } from "@/lib/useAdmin";

type Season = { id: number; name: string; start_date: string; end_date: string };
type Row = {
  position: number;
  member_id: number;
  name: string;
  events_shot: number;
  total_flys: number;
  total_group: number;
  total_score: number;
};

const fmt = (d: string) => new Date(d + "T00:00:00").toLocaleDateString("en-AU");

export default function SeasonRanking() {
  const isAdmin = useAdmin();
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [seasonId, setSeasonId] = useState<number | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [name, setName] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [error, setError] = useState("");

  async function loadSeasons(selectId?: number) {
    const { data } = await supabase.from("seasons").select("*").order("start_date", { ascending: false });
    const list = (data as Season[]) || [];
    setSeasons(list);
    if (selectId) return setSeasonId(selectId);
    // Default to the season containing today, otherwise the most recent one.
    const today = new Date().toISOString().slice(0, 10);
    const current = list.find((s) => s.start_date <= today && today <= s.end_date);
    setSeasonId((current || list[0])?.id ?? null);
  }
  useEffect(() => { loadSeasons(); }, []);

  useEffect(() => {
    if (seasonId === null) return setRows([]);
    supabase
      .from("season_ranking")
      .select("*")
      .eq("season_id", seasonId)
      .order("position")
      .then(({ data }) => setRows((data as Row[]) || []));
  }, [seasonId]);

  async function addSeason(e: React.FormEvent) {
    e.preventDefault();
    const { data, error } = await supabase
      .from("seasons")
      .insert({ name, start_date: start, end_date: end })
      .select("id")
      .single();
    if (error) {
      return setError(
        error.message.includes("exclude") ? "Those dates overlap an existing season." : error.message
      );
    }
    setName(""); setStart(""); setEnd(""); setError("");
    loadSeasons(data.id);
  }

  const season = seasons.find((s) => s.id === seasonId);

  return (
    <>
      <h1>Championship ranking</h1>

      <div className="row">
        <select value={seasonId ?? ""} onChange={(e) => setSeasonId(Number(e.target.value))}>
          {seasons.length === 0 && <option value="">No seasons yet</option>}
          {seasons.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        {season && (
          <span className="muted">
            {fmt(season.start_date)} to {fmt(season.end_date)} · ranked by total flys, then total score
          </span>
        )}
      </div>

      <table>
        <thead>
          <tr>
            <th>#</th><th>Name</th>
            <th className="num">Events</th>
            <th className="num">Flys</th>
            <th className="num">Group</th>
            <th className="num">Total score</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.member_id}>
              <td>{r.position}</td>
              <td>{r.name}</td>
              <td className="num">{r.events_shot}</td>
              <td className="num">{r.total_flys}</td>
              <td className="num">{r.total_group}</td>
              <td className="num">{r.total_score}</td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr><td colSpan={6} className="muted">No scores in this season yet.</td></tr>
          )}
        </tbody>
      </table>

      {isAdmin && (
        <>
          <h2>Add season</h2>
          <form onSubmit={addSeason} className="row">
            <input placeholder="Name (e.g. 2025/26 Championship)" value={name} onChange={(e) => setName(e.target.value)} required style={{ minWidth: 260 }} />
            <label>Start <input type="date" value={start} onChange={(e) => setStart(e.target.value)} required /></label>
            <label>End <input type="date" value={end} onChange={(e) => setEnd(e.target.value)} required /></label>
            <button type="submit">Add season</button>
          </form>
          {error && <p className="error">{error}</p>}
        </>
      )}
    </>
  );
}
