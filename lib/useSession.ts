"use client";

import { useEffect, useState } from "react";
import { Session } from "@/components/StudentForm";

export function useSession() {
  const [session, setSession] = useState<Session | null | undefined>(undefined); // undefined = loading
  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then(setSession)
      .catch(() => setSession(null));
  }, []);
  return session;
}
