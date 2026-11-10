"use client";
import { useEffect, useState } from "react";
import { supabase, Member } from "@/lib/supabase";
import { useAdmin } from "@/lib/useAdmin";

export default function Members() {
  const isAdmin = useAdmin();
  const [members, setMembers] = useState<Member[]>([]);
  const [name, setName] = useState("");
  const [number, setNumber] = useState("");
  const [error, setError] = useState("");

  async function load() {
    const { data } = await supabase.from("members").select("*").order("name");
    setMembers((data as Member[]) || []);
  }
  useEffect(() => { load(); }, []);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const n = number.trim() === "" ? null : Number(number);
    if (n !== null && !Number.isInteger(n)) return setError("Membership number must be a whole number.");
    const { error } = await supabase
      .from("members")
      .insert({ name: name.trim(), Membership_Number: n });
    if (error) return setError(error.message);
    setName(""); setNumber(""); setError(""); load();
  }

  async function saveNumber(m: Member, value: string) {
    const v = value.trim() === "" ? null : Number(value);
    if (v !== null && !Number.isInteger(v)) return setError("Membership number must be a whole number.");
    if (v === m.Membership_Number) return;
    const { error } = await supabase.from("members").update({ Membership_Number: v }).eq("id", m.id);
    if (error) setError(error.message); else { setError(""); load(); }
  }

  async function remove(id: number) {
    if (!confirm("Delete this member?")) return;
    const { error } = await supabase.from("members").delete().eq("id", id);
    if (error) setError(error.message);
    load();
  }

  return (
    <>
      <h1>Members</h1>
      {isAdmin && (
        <form onSubmit={add} className="row">
          <input placeholder="Member name" value={name} onChange={(e) => setName(e.target.value)} required />
          <input type="number" placeholder="Membership no." value={number} onChange={(e) => setNumber(e.target.value)} style={{ width: 150 }} />
          <button type="submit">Add member</button>
        </form>
      )}
      {isAdmin && (
        <p className="muted small">To add or fix a membership number, type it in the box and click out of it to save.</p>
      )}
      {error && <p className="error">{error}</p>}
      <table>
        <thead><tr><th>Membership no.</th><th>Name</th>{isAdmin && <th />}</tr></thead>
        <tbody>
          {members.map((m) => (
            <tr key={m.id}>
              <td>
                {isAdmin ? (
                  <input
                    key={`${m.id}-${m.Membership_Number}`}
                    type="number"
                    defaultValue={m.Membership_Number ?? ""}
                    placeholder="—"
                    aria-label={`${m.name} membership number`}
                    style={{ width: 120 }}
                    onBlur={(e) => saveNumber(m, e.target.value)}
                  />
                ) : (
                  m.Membership_Number ?? ""
                )}
              </td>
              <td>{m.name}</td>
              {isAdmin && (
                <td><button className="danger" onClick={() => remove(m.id)}>Delete</button></td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
