import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { hasSupabase, supabaseAnonKey, supabaseUrl } from "@/lib/env";

/** Client theo phiên đăng nhập của người dùng (chịu RLS). */
export async function sessionClient() {
  const store = await cookies();
  return createServerClient(supabaseUrl, supabaseAnonKey, {
    global: { fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }) },
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          list.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch {
          // Server Component không ghi được cookie; proxy đã làm mới phiên.
        }
      },
    },
  });
}

export async function currentUser() {
  if (!hasSupabase) return null;
  const db = await sessionClient();
  const { data } = await db.auth.getUser();
  return data.user;
}
