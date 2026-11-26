import "server-only";
import { createClient } from "@supabase/supabase-js";
import { supabaseAnonKey, supabaseUrl } from "@/lib/env";

/** Đọc dữ liệu công khai, không dùng cookie để trang vẫn ISR được. */
export const publicClient = () =>
  createClient(supabaseUrl, supabaseAnonKey, { auth: { persistSession: false, autoRefreshToken: false } });
