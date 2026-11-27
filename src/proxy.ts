import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { hasSupabase, supabaseAnonKey, supabaseUrl } from "@/lib/env";

/** Làm mới phiên Supabase. Quyền truy cập do RLS và từng trang kiểm tra, không dựa vào proxy. */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const signedIn = request.cookies.getAll().some((c) => c.name.startsWith("sb-"));
  if (!hasSupabase || !signedIn) return response;

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        list.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  await supabase.auth.getUser();
  return response;
}

export const config = { matcher: ["/phim/:path*", "/review/:path*", "/go/:path*", "/dang-nhap", "/admin/:path*"] };
