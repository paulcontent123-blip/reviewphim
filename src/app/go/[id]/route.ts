import { NextResponse, type NextRequest } from "next/server";
import { getWatchOption } from "@/lib/data";
import { currentUser } from "@/lib/supabase/server";
import { serviceClient } from "@/lib/supabase/service";
import { isUuid } from "@/lib/text";

export const dynamic = "force-dynamic";

/** Ghi lượt click rồi chuyển sang link affiliate. Lỗi ghi không được chặn người dùng. */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const option = isUuid(id) ? await getWatchOption(id) : null;
  if (!option) return new NextResponse("Không tìm thấy liên kết.", { status: 404 });

  try {
    const db = serviceClient();
    if (db) {
      const signedIn = request.cookies.getAll().some((c) => c.name.startsWith("sb-"));
      const user = signedIn ? await currentUser() : null;
      const { error } = await db
        .from("affiliate_clicks")
        .insert({ user_id: user?.id ?? null, film_id: option.film_id, platform: option.platform });
      if (error) throw new Error(error.message);
    }
  } catch (e) {
    console.error("affiliate_clicks", e instanceof Error ? e.message : e);
  }

  const res = NextResponse.redirect(option.url, 302);
  res.headers.set("Cache-Control", "no-store");
  res.headers.set("X-Robots-Tag", "noindex, nofollow");
  return res;
}
