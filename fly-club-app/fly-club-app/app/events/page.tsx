"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase, EventRow } from "@/lib/supabase";
import { useAdmin } from "@/lib/useAdmin";

export default function Events() {
  const isAdmin = useAdmin();
  const [events, setEvents] = useState<EventRow[]>([]);
  const [date, setDate] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");

  async function load() {
    const { data } = await supabase.from("events").select("*").order("event_date", { ascending: false });
    setEvents((data as EventRow[]) || []);
  }
  useEffect(() => { load(); }, []);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.from("events").insert({ event_date: date, description });
    if (error) return setError(error.message);
    setDate(""); setDescription(""); setError(""); load();
  }

  return (
    <>
      <h1>Events</h1>
      {isAdmin && (
        <form onSubmit={add} className="row">
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          <input placeholder="Event description" value={description} onChange={(e) => setDescription(e.target.value)} required />
          <button type="submit">Add event</button>
        </form>
      )}
      {error && <p className="error">{error}</p>}
      <table>
        <thead><tr><th>Date</th><th>Description</th></tr></thead>
        <tbody>
          {events.map((ev) => (
            <tr key={ev.id}>
              <td>{ev.event_date}</td>
              <td><Link href={`/events/${ev.id}`}>{ev.description}</Link></td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
