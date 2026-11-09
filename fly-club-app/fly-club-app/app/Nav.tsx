"use client";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useAdmin } from "@/lib/useAdmin";

export default function Nav() {
  const isAdmin = useAdmin();
  return (
    <nav>
      {isAdmin && (
        <>
          <Link href="/">Season</Link>
          <Link href="/events">Events</Link>
          <Link href="/members">Members</Link>
        </>
      )}
      <span className="spacer" />
      {isAdmin && (
        <a href="#" onClick={(e) => { e.preventDefault(); supabase.auth.signOut(); }}>
          Sign out
        </a>
      )}
    </nav>
  );
}
