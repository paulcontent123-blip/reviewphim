import { genresFromTmdb } from "@/lib/genres";
import { slugify } from "@/lib/text";
import type { FilmStatus } from "@/lib/types";

const API = "https://api.themoviedb.org/3";
const IMG = "https://image.tmdb.org/t/p";

export type TmdbType = "movie" | "tv";

export interface TmdbDetail {
  id: number;
  title?: string;
  name?: string;
  original_title?: string;
  original_name?: string;
  overview?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  release_date?: string;
  first_air_date?: string;
  number_of_episodes?: number;
  genres?: { id: number }[];
  production_countries?: { iso_3166_1: string }[];
  created_by?: { name: string }[];
  credits?: {
    cast?: { name: string; character?: string; profile_path?: string | null; order?: number }[];
    crew?: { name: string; job?: string }[];
  };
  videos?: { results?: { site?: string; type?: string; key?: string }[] };
  "watch/providers"?: { results?: Record<string, { flatrate?: unknown[] } | undefined> };
}

const img = (size: string, path?: string | null) => (path ? `${IMG}/${size}${path}` : null);

/** Chuyển dữ liệu TMDB sang cột của bảng films. Không điền imdb_score vì TMDB không cung cấp điểm IMDb. */
export function toFilm(type: TmdbType, d: TmdbDetail, listStatus: FilmStatus | null) {
  const title = (d.title ?? d.name ?? "").trim();
  const original = d.original_title ?? d.original_name ?? null;
  const date = d.release_date || d.first_air_date || "";
  const year = /^\d{4}/.test(date) ? Number(date.slice(0, 4)) : null;
  const country = d.production_countries?.[0]?.iso_3166_1;
  const trailer = d.videos?.results?.find((v) => v.site === "YouTube" && v.type === "Trailer" && v.key);
  const streamingInVn = Boolean(d["watch/providers"]?.results?.VN?.flatrate?.length);
  return {
    tmdb_id: d.id,
    tmdb_type: type,
    title,
    original_title: original,
    poster_url: img("w500", d.poster_path),
    backdrop_url: img("w1280", d.backdrop_path),
    genres: genresFromTmdb((d.genres ?? []).map((g) => g.id)),
    year,
    country: country ? new Intl.DisplayNames(["vi"], { type: "region" }).of(country) ?? null : null,
    director:
      d.credits?.crew?.filter((c) => c.job === "Director").map((c) => c.name).join(", ") ||
      d.created_by?.map((c) => c.name).join(", ") ||
      null,
    synopsis: d.overview?.trim() || null,
    trailer_url: trailer ? `https://www.youtube.com/watch?v=${trailer.key}` : null,
    status: listStatus ?? (streamingInVn ? ("streaming" as const) : null),
    total_episodes: type === "tv" ? Math.max(d.number_of_episodes ?? 1, 1) : 1,
  };
}

export type TmdbFilm = ReturnType<typeof toFilm>;

export function toCast(d: TmdbDetail) {
  return (d.credits?.cast ?? []).slice(0, 12).map((c, position) => ({
    position,
    name: c.name,
    role: c.character || null,
    avatar_url: img("w185", c.profile_path),
  }));
}

/** Slug ổn định: chỉ tạo lúc thêm phim, thêm id TMDB khi trùng hoặc tên không có chữ Latin. */
export function filmSlug(f: TmdbFilm, taken: (slug: string) => boolean): string {
  const base = [slugify(f.title) || slugify(f.original_title ?? "") || "phim", f.year].filter(Boolean).join("-");
  return taken(base) ? `${base}-${f.tmdb_id}` : base;
}

/** Bỏ các cột biên tập viên đã khóa. */
export function withoutLocked(f: TmdbFilm, locked: string[]): Partial<TmdbFilm> {
  return Object.fromEntries(Object.entries(f).filter(([k]) => !locked.includes(k))) as Partial<TmdbFilm>;
}

async function get<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const key = process.env.TMDB_API_KEY;
  if (!key) throw new Error("Thiếu TMDB_API_KEY");
  const url = new URL(API + path);
  url.search = new URLSearchParams({ language: "vi-VN", ...params, api_key: key }).toString();
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`TMDB ${path}: HTTP ${res.status}`); // không in URL vì chứa khóa
  return res.json() as Promise<T>;
}

export interface TmdbListItem {
  type: TmdbType;
  id: number;
  status: FilmStatus | null;
}

export async function listTargets(pages: number): Promise<TmdbListItem[]> {
  const lists: { path: string; type: TmdbType; status: FilmStatus | null }[] = [
    { path: "/movie/now_playing", type: "movie", status: "now_showing" },
    { path: "/movie/upcoming", type: "movie", status: "coming_soon" },
    { path: "/movie/popular", type: "movie", status: null },
    { path: "/tv/popular", type: "tv", status: null },
  ];
  const found = new Map<string, TmdbListItem>();
  for (const l of lists) {
    // Danh sách rạp phải lấy đủ (tối đa 10 trang) để biết phim nào đã rời rạp.
    let last = l.status ? 10 : pages;
    for (let page = 1; page <= last; page += 1) {
      const data = await get<{ results: { id: number }[]; total_pages: number }>(l.path, { region: "VN", page: String(page) });
      last = Math.min(last, data.total_pages);
      for (const { id } of data.results) {
        const key = `${l.type}:${id}`;
        if (!found.has(key)) found.set(key, { type: l.type, id, status: l.status });
      }
    }
  }
  return [...found.values()];
}

export const getDetail = (type: TmdbType, id: number) =>
  get<TmdbDetail>(`/${type}/${id}`, { append_to_response: "credits,videos,watch/providers", include_video_language: "vi,en" });
