"use client";
import { useEffect, useState } from "react";
import { supabase } from "./supabase";

// True when someone is signed in. Only signed-in users can write (see RLS in schema.sql).
export function useAdmin() {
  const [isAdmin, setIsAdmin] = useState(false);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setIsAdmin(!!data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) =>
      setIsAdmin(!!session)
    );
    return () => sub.subscription.unsubscribe();
  }, []);
  return isAdmin;
}
