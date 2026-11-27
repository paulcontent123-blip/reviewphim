import { NextResponse, type NextRequest } from "next/server";
import { hasSupabase } from "@/lib/env";
import { sessionClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/text";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const next = safeNext(request.nextUrl.searchParams.get("next"));
  if (hasSupabase && code) {
    const db = await sessionClient();
    const { error } = await db.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, request.nextUrl.origin));
  }
  return NextResponse.redirect(new URL("/dang-nhap?loi=1", request.nextUrl.origin));
}
