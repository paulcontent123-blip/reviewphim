"use client";

import { useEffect } from "react";
import { browserClient } from "@/lib/supabase/browser";
import { useAuth } from "@/store/auth";

/** Đồng bộ phiên Supabase vào store; giao diện dùng, còn quyền thật do RLS quyết định. */
export function AuthProvider() {
  const setUser = useAuth((s) => s.setUser);
  useEffect(() => {
    const db = browserClient();
    if (!db) {
      setUser(null);
      return;
    }
    const { data } = db.auth.onAuthStateChange((_event, session) =>
      setUser(session ? { id: session.user.id, email: session.user.email ?? null } : null),
    );
    return () => data.subscription.unsubscribe();
  }, [setUser]);
  return null;
}
