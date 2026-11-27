"use client";

import Link from "next/link";
import useSWR from "swr";
import { browserClient } from "@/lib/supabase/browser";
import { useAuth } from "@/store/auth";

/** Chỉ để tiện đi tới trang quản trị; quyền thật do server và database kiểm tra. */
export function AdminLink() {
  const user = useAuth((s) => s.user);
  const { data: isAdmin } = useSWR(user ? ["is-admin", user.id] : null, async ([, id]) => {
    const { data } = await browserClient()!.from("profiles").select("role").eq("id", id).maybeSingle();
    return data?.role === "admin";
  });
  if (!user || !isAdmin) return null;
  return (
    <Link href="/admin" className="btn-ghost shrink-0 whitespace-nowrap px-3" prefetch={false}>
      Quản trị
    </Link>
  );
}
