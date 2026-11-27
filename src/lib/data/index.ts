import "server-only";
import { cache } from "react";
import { hasSupabase } from "@/lib/env";
import { publicClient } from "@/lib/supabase/public";
import { unaccent } from "@/lib/text";
import type { Actor, Film, FilmDetail, FilmQuery, Review, ReviewQuery, WatchOption } from "@/lib/types";
import { FILMS, REVIEWS, sampleFilms, sampleReviews } from "./sample";

/** Chạy dữ liệu mẫu khi chưa cấu hình Supabase, trừ bản production trên Vercel. */
export function usingSample(): boolean {
  if (hasSupabase) return false;
  if (process.env.VERCEL_ENV === "production") {
    throw new Error("Thiếu NEXT_PUBLIC_SUPABASE_URL hoặc NEXT_PUBLIC_SUPABASE_ANON_KEY trên production.");
  }
  return true;
}

const FILM_COLUMNS =
  "id,slug,title,original_title,poster_url,backdrop_url,genres,year,country,imdb_score,site_score,vote_count,director,synopsis,trailer_url,status,total_episodes,updated_at";

function unwrap<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(`Supabase: ${res.error.message}`);
  return res.data as T;
}

export async function listFilms(q: FilmQuery = {}): Promise<Film[]> {
  if (usingSample()) return sampleFilms(q);
  let query = publicClient().from("films").select(FILM_COLUMNS);
  if (q.status) query = query.eq("status", q.status);
  if (q.genre) query = query.contains("genres", [q.genre]);
  if (q.year) query = query.eq("year", q.year);
  if (q.q) query = query.ilike("search_text", `%${unaccent(q.q).replace(/[\\%_*]/g, " ").trim()}%`);
  query =
    q.sort === "score"
      ? query.gt("vote_count", 0).order("site_score", { ascending: false }).order("vote_count", { ascending: false })
      : query.order("year", { ascending: false, nullsFirst: false }).order("created_at", { ascending: false });
  return unwrap<Film[]>(await query.limit(q.limit ?? 24));
}

export const getFilm = cache(async (slug: string): Promise<FilmDetail | null> => {
  if (usingSample()) return FILMS.find((f) => f.slug === slug) ?? null;
  const db = publicClient();
  const film = unwrap<Film | null>(await db.from("films").select(FILM_COLUMNS).eq("slug", slug).maybeSingle());
  if (!film) return null;
  const [cast, options] = await Promise.all([
    db.from("film_cast").select("name,role,avatar_url").eq("film_id", film.id).order("position").limit(12),
    db.from("watch_options").select("id,film_id,platform,url,type,quality,label").eq("film_id", film.id),
  ]);
  return { ...film, cast: unwrap<Actor[]>(cast), watch_options: unwrap<WatchOption[]>(options) };
});

/** Phim đã có link xem chưa, để không mời bấm vào ô trống. */
export async function hasWatchOptions(filmId: string): Promise<boolean> {
  if (usingSample()) return FILMS.some((f) => f.id === filmId && f.watch_options.length > 0);
  const res = await publicClient().from("watch_options").select("id").eq("film_id", filmId).limit(1);
  return unwrap<{ id: string }[]>(res).length > 0;
}

export async function getWatchOption(id: string): Promise<WatchOption | null> {
  if (usingSample()) return FILMS.flatMap((f) => f.watch_options).find((o) => o.id === id) ?? null;
  return unwrap<WatchOption | null>(
    await publicClient().from("watch_options").select("id,film_id,platform,url,type,quality,label").eq("id", id).maybeSingle(),
  );
}

export async function listReviews(q: ReviewQuery = {}): Promise<Review[]> {
  if (usingSample()) return sampleReviews(q);
  let query = publicClient().from("review_feed").select("*");
  if (q.filmId) query = query.eq("film_id", q.filmId);
  if (q.genre) query = query.contains("film_genres", [q.genre]);
  if (q.minScore) query = query.gte("score", q.minScore);
  return unwrap<Review[]>(await query.order("published_at", { ascending: false }).limit(q.limit ?? 20));
}

export const getReview = cache(async (slug: string): Promise<Review | null> => {
  if (usingSample()) return REVIEWS.find((r) => r.slug === slug) ?? null;
  return unwrap<Review | null>(await publicClient().from("review_feed").select("*").eq("slug", slug).maybeSingle());
});

/** Dữ liệu cho sitemap; PostgREST trả tối đa 1000 dòng mỗi lần nên phải phân trang. */
export async function listSitemap(): Promise<{
  films: { slug: string; year: number | null; updated_at: string }[];
  reviews: { slug: string; published_at: string }[];
}> {
  if (usingSample()) return { films: FILMS, reviews: REVIEWS };
  const all = async <T>(table: string, columns: string): Promise<T[]> => {
    const rows: T[] = [];
    for (let from = 0; ; from += 1000) {
      const page = unwrap<T[]>(
        (await publicClient().from(table).select(columns).order("slug").range(from, from + 999)) as unknown as {
          data: T[] | null;
          error: { message: string } | null;
        },
      );
      rows.push(...page);
      if (page.length < 1000) return rows;
    }
  };
  const [films, reviews] = await Promise.all([
    all<{ slug: string; year: number | null; updated_at: string }>("films", "slug,year,updated_at"),
    all<{ slug: string; published_at: string }>("review_feed", "slug,published_at"),
  ]);
  return { films, reviews };
}
