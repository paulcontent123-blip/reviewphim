import "server-only";
import { notFound, redirect } from "next/navigation";
import { hasSupabase } from "@/lib/env";
import { currentUser, sessionClient } from "@/lib/supabase/server";
import { unaccent } from "@/lib/text";
import type { WatchOption } from "@/lib/types";

// Mọi truy vấn chạy theo phiên người đăng nhập, không dùng khóa secret: database quyết quyền.

export const PAGE_SIZE = 50;
export const REVIEW_PAGE_SIZE = 20;

/** Chặn trang quản trị: chưa đăng nhập thì đi đăng nhập, không phải admin thì như trang không tồn tại. */
export async function requireAdmin(path: string): Promise<void> {
  if (!hasSupabase) notFound();
  const user = await currentUser();
  if (!user) redirect(`/dang-nhap?next=${encodeURIComponent(path)}`);
  const { data } = await sessionClient().from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (data?.role !== "admin") notFound();
}

function unwrap<T>(res: { data: unknown; error: { message: string } | null }): T {
  if (res.error) throw new Error(`Supabase: ${res.error.message}`);
  return res.data as T;
}

export interface AdminFilm {
  id: string;
  slug: string;
  title: string;
  year: number | null;
  watch_options: { id: string }[];
}

export async function adminFilms({ q, missing, page }: { q: string; missing: boolean; page: number }) {
  let query = sessionClient().from("films").select("id,slug,title,year,watch_options(id)", { count: "exact" });
  if (q) query = query.ilike("search_text", `%${unaccent(q).replace(/[\\%_*]/g, " ").trim()}%`);
  // Phim không có dòng nào trong watch_options.
  if (missing) query = query.is("watch_options", null);
  const res = await query.order("created_at", { ascending: false }).order("id").range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
  return { films: unwrap<AdminFilm[]>(res), total: res.count ?? 0 };
}

export type AdminFilmDetail = { id: string; slug: string; title: string; watch_options: WatchOption[] };

export async function adminFilm(slug: string): Promise<AdminFilmDetail | null> {
  const res = await sessionClient()
    .from("films")
    .select("id,slug,title,watch_options(id,film_id,platform,url,type,quality,label)")
    .eq("slug", slug)
    .maybeSingle();
  return unwrap<AdminFilmDetail | null>(res);
}

export interface AdminReview {
  id: string;
  slug: string;
  title: string;
  content: string;
  score: number;
  spoiler: boolean;
  status: "published" | "hidden";
  published_at: string;
  film_slug: string;
  film_title: string;
  author_name: string;
}

/** Lấy dư một dòng để biết còn trang sau hay không. */
export async function adminReviews(status: AdminReview["status"], page: number) {
  const rows = unwrap<AdminReview[]>(
    await sessionClient().rpc("admin_reviews", {
      only_status: status,
      page_size: REVIEW_PAGE_SIZE + 1,
      page_offset: page * REVIEW_PAGE_SIZE,
    }),
  );
  return { reviews: rows.slice(0, REVIEW_PAGE_SIZE), hasNext: rows.length > REVIEW_PAGE_SIZE };
}
