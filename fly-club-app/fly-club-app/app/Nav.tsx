"use client";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useAdmin } from "@/lib/useAdmin";
import Logo from "./Logo";

export default function Nav() {
  const isAdmin = useAdmin();
  return (
    <nav>
      <Link href={isAdmin ? "/" : "/results"} aria-label="Home">
        <Logo size={36} />
      </Link>
      {isAdmin ? (
        <>
          <Link href="/">Season</Link>
          <Link href="/events">Events</Link>
          <Link href="/members">Members</Link>
          <Link href="/results">Public view</Link>
        </>
      ) : (
        <Link href="/results">Fly Club results</Link>
      )}
      <span className="spacer" />
      {isAdmin ? (
        <a href="#" onClick={(e) => { e.preventDefault(); supabase.auth.signOut(); }}>
          Sign out
        </a>
      ) : (
        <Link href="/login">Admin login</Link>
      )}
    </nav>
  );
}
