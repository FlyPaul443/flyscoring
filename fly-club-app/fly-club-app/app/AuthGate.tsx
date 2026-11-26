"use client";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

// Pages anyone can open without signing in. Everything else needs a login.
const PUBLIC_PAGES = ["/results", "/login"];

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const isPublic = PUBLIC_PAGES.includes(pathname);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSignedIn(!!data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) =>
      setSignedIn(!!session)
    );
    return () => sub.subscription.unsubscribe();
  }, []);

  // Signed-out visitors on an admin page are sent to the public results page.
  useEffect(() => {
    if (signedIn === false && !isPublic) router.replace("/results");
  }, [signedIn, isPublic, router]);

  if (isPublic) return <>{children}</>;
  if (!signedIn) return <p className="muted">Loading…</p>;
  return <>{children}</>;
}
