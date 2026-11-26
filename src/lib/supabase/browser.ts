import { createBrowserClient } from "@supabase/ssr";
import { hasSupabase, supabaseAnonKey, supabaseUrl } from "@/lib/env";

/** null khi chưa cấu hình Supabase (chế độ dữ liệu mẫu). */
export const browserClient = () => (hasSupabase ? createBrowserClient(supabaseUrl, supabaseAnonKey) : null);
