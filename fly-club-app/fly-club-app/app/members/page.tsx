"use client";
import { useEffect, useState } from "react";
import { supabase, Member } from "@/lib/supabase";
import { useAdmin } from "@/lib/useAdmin";

export default function Members() {
  const isAdmin = useAdmin();
  const [members, setMembers] = useState<Member[]>([]);
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  async function load() {
    const { data } = await supabase.from("members").select("*").order("name");
    setMembers((data as Member[]) || []);
  }
  useEffect(() => { load(); }, []);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.from("members").insert({ name: name.trim() });
    if (error) return setError(error.message);
    setName(""); setError(""); load();
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
          <button type="submit">Add member</button>
        </form>
      )}
      {error && <p className="error">{error}</p>}
      <table>
        <thead><tr><th>ID</th><th>Name</th>{isAdmin && <th />}</tr></thead>
        <tbody>
          {members.map((m) => (
            <tr key={m.id}>
              <td>{m.id}</td>
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
