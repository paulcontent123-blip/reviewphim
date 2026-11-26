import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { filmSlug, getDetail, listTargets, toCast, toFilm, withoutLocked, type TmdbListItem } from "@/lib/tmdb";

export interface SyncResult {
  inserted: number;
  updated: number;
  cleared: number;
  failed: string[];
}

/** Phim không còn trong danh sách rạp của TMDB thì bỏ trạng thái đang chiếu / sắp chiếu. */
async function clearStale(db: SupabaseClient, targets: TmdbListItem[]): Promise<number> {
  const live = new Set(targets.filter((t) => t.status).map((t) => t.id));
  if (!live.size) return 0;
  const { data, error } = await db
    .from("films")
    .select("id,tmdb_id,locked_fields")
    .eq("tmdb_type", "movie")
    .in("status", ["now_showing", "coming_soon"]);
  if (error) throw new Error(error.message);
  const stale = data.filter((f) => !live.has(f.tmdb_id) && !f.locked_fields.includes("status")).map((f) => f.id);
  for (let i = 0; i < stale.length; i += 100) {
    const res = await db.from("films").update({ status: null }).in("id", stale.slice(i, i + 100));
    if (res.error) throw new Error(res.error.message);
  }
  return stale.length;
}

async function syncOne(db: SupabaseClient, item: TmdbListItem): Promise<"inserted" | "updated"> {
  const detail = await getDetail(item.type, item.id);
  const film = toFilm(item.type, detail, item.status);
  if (!film.title) throw new Error("không có tên phim");

  const existing = await db
    .from("films")
    .select("id,locked_fields")
    .eq("tmdb_type", item.type)
    .eq("tmdb_id", item.id)
    .maybeSingle();
  if (existing.error) throw new Error(existing.error.message);

  let filmId: string;
  let locked: string[] = [];
  if (existing.data) {
    filmId = existing.data.id;
    locked = existing.data.locked_fields ?? [];
    const { error } = await db.from("films").update(withoutLocked(film, locked)).eq("id", filmId);
    if (error) throw new Error(error.message);
  } else {
    const base = filmSlug(film, () => false);
    const dup = await db.from("films").select("id").eq("slug", base).maybeSingle();
    if (dup.error) throw new Error(dup.error.message);
    const slug = filmSlug(film, () => Boolean(dup.data));
    const { data, error } = await db.from("films").insert({ ...film, slug }).select("id").single();
    if (error) throw new Error(error.message);
    filmId = data.id;
  }

  const cast = toCast(detail);
  if (cast.length && !locked.includes("cast")) {
    const up = await db.from("film_cast").upsert(cast.map((c) => ({ ...c, film_id: filmId })));
    if (up.error) throw new Error(up.error.message);
    const del = await db.from("film_cast").delete().eq("film_id", filmId).gte("position", cast.length);
    if (del.error) throw new Error(del.error.message);
  }
  return existing.data ? "updated" : "inserted";
}

export async function syncTmdb(db: SupabaseClient, pages: number): Promise<SyncResult> {
  const result: SyncResult = { inserted: 0, updated: 0, cleared: 0, failed: [] };
  const targets = await listTargets(pages);
  result.cleared = await clearStale(db, targets);
  const queue = [...targets];
  const worker = async () => {
    for (let item = queue.shift(); item; item = queue.shift()) {
      try {
        result[await syncOne(db, item)] += 1;
      } catch (e) {
        result.failed.push(`${item.type}/${item.id}: ${e instanceof Error ? e.message : "lỗi"}`);
      }
    }
  };
  await Promise.all(Array.from({ length: 5 }, worker));
  return result;
}
