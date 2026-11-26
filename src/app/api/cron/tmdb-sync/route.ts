import { timingSafeEqual } from "node:crypto";
import { revalidatePath } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";
import { serviceClient } from "@/lib/supabase/service";
import { syncTmdb } from "@/lib/tmdb-sync";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

function authorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const given = Buffer.from(request.headers.get("authorization") ?? "");
  const want = Buffer.from(`Bearer ${secret}`);
  return given.length === want.length && timingSafeEqual(given, want);
}

export async function GET(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const db = serviceClient();
  if (!db) return NextResponse.json({ error: "Thiếu SUPABASE_SERVICE_ROLE_KEY" }, { status: 503 });
  const pages = Math.min(Math.max(Math.trunc(Number(request.nextUrl.searchParams.get("pages"))) || 1, 1), 5);
  try {
    const result = await syncTmdb(db, pages);
    revalidatePath("/", "layout");
    return NextResponse.json(result);
  } catch (e) {
    console.error("tmdb-sync", e);
    return NextResponse.json({ error: e instanceof Error ? e.message : "lỗi" }, { status: 502 });
  }
}
