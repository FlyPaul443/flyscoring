"use client";
import { useEffect, useState, use } from "react";
import { supabase, Member, EventRow } from "@/lib/supabase";
import { useAdmin } from "@/lib/useAdmin";

const BAYS = Array.from({ length: 10 }, (_, i) => [`${i + 1}A`, `${i + 1}B`]).flat();
const CARDS = [1, 2, 3, 4, 5];

type Card = { card: number; score: number; group_score: number; flys: number };
type Entry = {
  id: number;
  detail: number;
  bay: string;
  members: { name: string };
  scores: Card[];
};

type Result = {
  position: number;
  name: string;
  detail: number;
  bay: string;
  total_score: number;
  total_group: number;
  total_flys: number;
};

export default function EventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const eventId = Number(id);
  const isAdmin = useAdmin();

  const [event, setEvent] = useState<EventRow | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [results, setResults] = useState<Result[]>([]);
  const [memberId, setMemberId] = useState("");
  const [detail, setDetail] = useState(1);
  const [bay, setBay] = useState("1A");
  const [error, setError] = useState("");

  async function load() {
    const [ev, mem, ent, res] = await Promise.all([
      supabase.from("events").select("*").eq("id", eventId).single(),
      supabase.from("members").select("*").order("name"),
      supabase
        .from("entries")
        .select("id, detail, bay, members(name), scores(card, score, group_score, flys)")
        .eq("event_id", eventId)
        .order("detail")
        .order("bay"),
      supabase.from("event_results").select("*").eq("event_id", eventId).order("position"),
    ]);
    setEvent(ev.data as EventRow);
    setMembers((mem.data as Member[]) || []);
    setEntries((ent.data as unknown as Entry[]) || []);
    setResults((res.data as Result[]) || []);
  }
  useEffect(() => { load(); }, [eventId]);

  async function addEntry(e: React.FormEvent) {
    e.preventDefault();
    // The database creates the five blank cards automatically.
    const { error } = await supabase
      .from("entries")
      .insert({ event_id: eventId, member_id: Number(memberId), detail, bay });
    if (error) return setError(error.message.includes("duplicate")
      ? "That shooter is already entered, or that bay is taken in this detail."
      : error.message);
    setError(""); setMemberId(""); load();
  }

  async function removeEntry(entryId: number) {
    if (!confirm("Remove this shooter from the event?")) return;
    await supabase.from("entries").delete().eq("id", entryId);
    load();
  }

  async function saveScores(entry: Entry, form: HTMLFormElement) {
    const f = new FormData(form);
    const n = (k: string) => Number(f.get(k) || 0);
    const rows = CARDS.map((c) => ({
      entry_id: entry.id,
      card: c,
      score: n(`score_${c}`),
      group_score: n(`group_${c}`),
      flys: n(`flys_${c}`),
    }));
    const { error } = await supabase.from("scores").upsert(rows, { onConflict: "entry_id,card" });
    if (error) setError(error.message); else { setError(""); load(); }
  }

  const sum = (cards: Card[], k: keyof Card) => cards.reduce((t, c) => t + Number(c[k] || 0), 0);

  if (!event) return <p className="muted">Loading…</p>;

  return (
    <>
      <h1>{event.description}</h1>
      <p className="muted">{event.event_date}</p>
      {error && <p className="error">{error}</p>}

      <h2>Results</h2>
      <table>
        <thead>
          <tr>
            <th>#</th><th>Name</th><th>Detail</th><th>Bay</th>
            <th className="num">Score</th><th className="num">Group</th><th className="num">Flys</th>
          </tr>
        </thead>
        <tbody>
          {results.map((r, i) => (
            <tr key={i}>
              <td>{r.position}</td><td>{r.name}</td><td>{r.detail}</td><td>{r.bay}</td>
              <td className="num"><strong>{r.total_score}</strong></td>
              <td className="num">{r.total_group}</td>
              <td className="num">{r.total_flys}</td>
            </tr>
          ))}
          {results.length === 0 && <tr><td colSpan={7} className="muted">No entries yet.</td></tr>}
        </tbody>
      </table>

      {isAdmin && (
        <>
          <h2>Add shooter</h2>
          <form onSubmit={addEntry} className="row">
            <select value={memberId} onChange={(e) => setMemberId(e.target.value)} required>
              <option value="">Select member…</option>
              {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
            <label>Detail <input type="number" min={1} value={detail} onChange={(e) => setDetail(Number(e.target.value))} style={{ width: 70 }} /></label>
            <select value={bay} onChange={(e) => setBay(e.target.value)}>
              {BAYS.map((b) => <option key={b}>{b}</option>)}
            </select>
            <button type="submit">Add</button>
          </form>

          <h2>Enter scores</h2>
          {entries.map((en) => {
            const byCard = (c: number) => en.scores?.find((s) => s.card === c);
            const total = `${sum(en.scores || [], "score")}-${sum(en.scores || [], "group_score")}-${sum(en.scores || [], "flys")}`;
            return (
              <form
                key={`${en.id}-${total}`}
                className="card"
                onSubmit={(e) => { e.preventDefault(); saveScores(en, e.currentTarget); }}
              >
                <div className="row" style={{ marginTop: 0 }}>
                  <strong>{en.members.name}</strong>
                  <span className="muted">Detail {en.detail} · Bay {en.bay}</span>
                  <span style={{ flex: 1 }} />
                  <span>
                    Total: <strong>{sum(en.scores || [], "score")}</strong> score ·{" "}
                    <strong>{sum(en.scores || [], "group_score")}</strong> group ·{" "}
                    <strong>{sum(en.scores || [], "flys")}</strong> flys
                  </span>
                </div>
                <table>
                  <thead>
                    <tr><th>Card</th><th className="num">Score</th><th className="num">Group</th><th className="num">Flys</th></tr>
                  </thead>
                  <tbody>
                    {CARDS.map((c) => (
                      <tr key={c}>
                        <td>Card {c}</td>
                        <td className="num"><input className="score" name={`score_${c}`} type="number" step="any" defaultValue={byCard(c)?.score ?? 0} aria-label={`${en.members.name} card ${c} score`} /></td>
                        <td className="num"><input className="score" name={`group_${c}`} type="number" step="any" defaultValue={byCard(c)?.group_score ?? 0} aria-label={`${en.members.name} card ${c} group`} /></td>
                        <td className="num"><input className="score" name={`flys_${c}`} type="number" defaultValue={byCard(c)?.flys ?? 0} aria-label={`${en.members.name} card ${c} flys`} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="row">
                  <button type="submit">Save scores</button>
                  <button type="button" className="danger" onClick={() => removeEntry(en.id)}>Remove shooter</button>
                </div>
              </form>
            );
          })}
        </>
      )}
    </>
  );
}
