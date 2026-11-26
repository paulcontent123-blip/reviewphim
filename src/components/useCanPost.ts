"use client";

import useSWR from "swr";
import { canPostContent } from "@/lib/content";
import { hasSupabase } from "@/lib/env";
import { browserClient } from "@/lib/supabase/browser";
import { useAuth } from "@/store/auth";

/** undefined: đang hỏi database. Chế độ dữ liệu mẫu luôn true. Admin nhận true cả khi công tắc tắt. */
export function useCanPost(): boolean | undefined {
  const user = useAuth((s) => s.user);
  // Chờ biết phiên đăng nhập rồi mới hỏi, vì câu trả lời của admin khác người khác.
  const key = hasSupabase && user !== undefined ? ["can-post", user?.id ?? null] : null;
  const { data } = useSWR(key, () => canPostContent(browserClient()!));
  return hasSupabase ? data : true;
}
