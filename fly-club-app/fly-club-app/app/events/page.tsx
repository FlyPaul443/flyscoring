"use client";
import { Fragment, useEffect, useState, use } from "react";
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

// Saved values for an entry as strings keyed s1..s5 (score), g1..g5 (group), f1..f5 (flys)
function baseline(entry: Entry): Record<string, string> {
  const v: Record<string, string> = {};
  for (const c of CARDS) {
    const card = entry.scores?.find((s) => s.card === c);
    v[`s${c}`] = String(card?.score ?? 0);
    v[`g${c}`] = String(card?.group_score ?? 0);
    v[`f${c}`] = String(card?.flys ?? 0);
  }
  return v;
}

// One compact row per shooter: five cards of Score / Group / Flys, live totals, Save.
function ScoreRow({
  entry, onSaved, onRemove, onError,
}: {
  entry: Entry;
  onSaved: () => void;
  onRemove: (id: number) => void;
  onError: (msg: string) => void;
}) {
  const saved = baseline(entry);
  const [vals, setVals] = useState<Record<string, string>>(saved);
  const [saving, setSaving] = useState(false);

  const num = (k: string) => Number(vals[k] || 0);
  const total = (p: string) => CARDS.reduce((t, c) => t + num(`${p}${c}`), 0);
  const dirty = Object.keys(saved).some((k) => Number(vals[k] || 0) !== Number(saved[k]));

  async function save() {
    setSaving(true);
    const rows = CARDS.map((c) => ({
      entry_id: entry.id,
      card: c,
      score: num(`s${c}`),
      group_score: num(`g${c}`),
      flys: Math.round(num(`f${c}`)),
    }));
    const { error } = await supabase.from("scores").upsert(rows, { onConflict: "entry_id,card" });
    setSaving(false);
    if (error) onError(error.message); else { onError(""); onSaved(); }
  }

  const cell = (k: string, i: number) => (
    <td key={k} className={`mini-cell${i === 0 ? " sep" : ""}`}>
      <input
        className="mini"
        type="number"
        step="any"
        inputMode="decimal"
        value={vals[k]}
        aria-label={`${entry.members.name} card ${k.slice(1)} ${k[0] === "s" ? "score" : k[0] === "g" ? "group" : "flys"}`}
        onFocus={(e) => e.target.select()}
        onChange={(e) => setVals({ ...vals, [k]: e.target.value })}
        onKeyDown={(e) => { if (e.key === "Enter") save(); }}
      />
    </td>
  );

  return (
    <tr className={dirty ? "dirty" : ""}>
      <td className="bay"><strong>{entry.bay}</strong> <span className="muted small">D{entry.detail}</span></td>
      <td className="name">{entry.members.name}</td>
      {CARDS.map((c) => (
        <Fragment key={c}>
          {cell(`s${c}`, 0)}
          {cell(`g${c}`, 1)}
          {cell(`f${c}`, 2)}
        </Fragment>
      ))}
      <td className="num sep tot"><strong>{total("s")}</strong></td>
      <td className="num tot">{total("g")}</td>
      <td className="num tot">{total("f")}</td>
      <td className="actions">
        <button type="button" className={dirty ? "" : "secondary"} disabled={!dirty || saving} onClick={save}>
          {saving ? "…" : dirty ? "Save" : "Saved"}
        </button>
        <button type="button" className="danger icon" aria-label={`Remove ${entry.members.name}`} onClick={() => onRemove(entry.id)}>✕</button>
      </td>
    </tr>
  );
}

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
          <p className="muted small" style={{ marginTop: -8 }}>
            S = score, G = group, F = flys. Press Enter in any box to save that row.
          </p>
          <div className="sheet-wrap">
            <table className="sheet">
              <thead>
                <tr>
                  <th rowSpan={2}>Bay</th>
                  <th rowSpan={2}>Shooter</th>
                  {CARDS.map((c) => <th key={c} colSpan={3} className="sep centre">Card {c}</th>)}
                  <th colSpan={3} className="sep centre">Total</th>
                  <th rowSpan={2} />
                </tr>
                <tr>
                  {CARDS.map((c) => (
                    <Fragment key={c}>
                      <th className="sep centre">S</th><th className="centre">G</th><th className="centre">F</th>
                    </Fragment>
                  ))}
                  <th className="sep centre">S</th><th className="centre">G</th><th className="centre">F</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((en) => (
                  <ScoreRow
                    key={en.id}
                    entry={en}
                    onSaved={load}
                    onRemove={removeEntry}
                    onError={setError}
                  />
                ))}
                {entries.length === 0 && (
                  <tr><td colSpan={21} className="muted">Add a shooter above to start entering scores.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
}
