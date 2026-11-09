"use client";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

// Everything except /login requires a signed-in user. Signing out sends you back to /login.
export default function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [signedIn, setSignedIn] = useState<boolean | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSignedIn(!!data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) =>
      setSignedIn(!!session)
    );
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (signedIn === false && pathname !== "/login") router.replace("/login");
  }, [signedIn, pathname, router]);

  if (pathname === "/login") return <>{children}</>;
  if (!signedIn) return <p className="muted">Loading…</p>;
  return <>{children}</>;
}
