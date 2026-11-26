import type { SupabaseClient } from "@supabase/supabase-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { syncTmdb } from "@/lib/tmdb-sync";

vi.mock("server-only", () => ({}));

type Row = Record<string, unknown>;
type DbError = { code: string; message: string };
type Result = { data: unknown; error: DbError | null };

/** Database giả trong bộ nhớ, chỉ đủ các lệnh syncTmdb dùng, kèm hai ràng buộc duy nhất của bảng films. */
function fakeDb() {
  const tables: Record<"films" | "film_cast", Row[]> = { films: [], film_cast: [] };
  let nextId = 0;
  const duplicate = (name: string): Result => ({
    data: null,
    error: { code: "23505", message: `duplicate key value violates unique constraint "${name}"` },
  });

  function from(table: "films" | "film_cast") {
    const filters: ((r: Row) => boolean)[] = [];
    let action: () => Result = () => ({ data: matched(), error: null });
    let one = false;
    const matched = () => tables[table].filter((r) => filters.every((f) => f(r)));
    const query = {
      select: () => query,
      eq: (k: string, v: unknown) => (filters.push((r) => r[k] === v), query),
      in: (k: string, v: unknown[]) => (filters.push((r) => v.includes(r[k])), query),
      gte: (k: string, v: number) => (filters.push((r) => (r[k] as number) >= v), query),
      maybeSingle: () => ((one = true), query),
      single: () => ((one = true), query),
      update: (patch: Row) => {
        action = () => {
          matched().forEach((r) => Object.assign(r, patch));
          return { data: null, error: null };
        };
        return query;
      },
      delete: () => {
        action = () => {
          const gone = new Set(matched());
          tables[table] = tables[table].filter((r) => !gone.has(r));
          return { data: null, error: null };
        };
        return query;
      },
      insert: (values: Row) => {
        action = () => {
          if (tables.films.some((r) => r.slug === values.slug)) return duplicate("films_slug_key");
          if (tables.films.some((r) => r.tmdb_type === values.tmdb_type && r.tmdb_id === values.tmdb_id))
            return duplicate("films_tmdb_key");
          const row = { id: `film-${++nextId}`, locked_fields: [], site_score: null, vote_count: 0, imdb_score: null, ...values };
          tables.films.push(row);
          return { data: [row], error: null };
        };
        return query;
      },
      upsert: (rows: Row[]) => {
        action = () => {
          for (const row of rows) {
            const old = tables.film_cast.find((r) => r.film_id === row.film_id && r.position === row.position);
            if (old) Object.assign(old, row);
            else tables.film_cast.push({ ...row });
          }
          return { data: null, error: null };
        };
        return query;
      },
      then: <T>(resolve: (r: Result) => T) =>
        Promise.resolve()
          .then(() => {
            const res = action();
            return one && !res.error ? { ...res, data: (res.data as Row[])[0] ?? null } : res;
          })
          .then(resolve),
    };
    return query;
  }

  return { tables, client: { from } as unknown as SupabaseClient };
}

/** TMDB giả: danh sách và chi tiết phim lấy từ đối tượng này. */
let tmdb: { nowPlaying: number[]; popular: number[]; titles: Record<number, string> };

beforeEach(() => {
  tmdb = { nowPlaying: [1], popular: [2], titles: { 1: "Phim Một", 2: "Phim Hai" } };
  vi.stubEnv("TMDB_API_KEY", "khoa-gia");
  vi.stubGlobal("fetch", async (url: URL) => {
    const path = url.pathname.replace("/3", "");
    const list = (ids: number[]) => Response.json({ results: ids.map((id) => ({ id })), total_pages: 1 });
    if (path === "/movie/now_playing") return list(tmdb.nowPlaying);
    if (path === "/movie/upcoming" || path === "/tv/popular") return list([]);
    if (path === "/movie/popular") return list(tmdb.popular);
    const id = Number(path.split("/").pop());
    if (!tmdb.titles[id]) return new Response("", { status: 404 });
    return Response.json({
      id,
      title: tmdb.titles[id],
      release_date: "2026-01-01",
      overview: "Mô tả từ TMDB",
      credits: { cast: [{ name: "Diễn viên A" }, { name: "Diễn viên B" }], crew: [{ name: "Đạo diễn", job: "Director" }] },
    });
  });
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("syncTmdb", () => {
  it("chạy hai lần không trùng phim, không đổi slug", async () => {
    const db = fakeDb();
    expect(await syncTmdb(db.client, 1)).toMatchObject({ inserted: 2, updated: 0, failed: [] });
    const slugs = db.tables.films.map((f) => f.slug).sort();
    expect(await syncTmdb(db.client, 1)).toMatchObject({ inserted: 0, updated: 2, failed: [] });
    expect(db.tables.films.map((f) => f.slug).sort()).toEqual(slugs);
    expect(db.tables.film_cast).toHaveLength(4);
  });

  it("giữ cột và diễn viên đã khóa, cập nhật lại cột không khóa", async () => {
    const db = fakeDb();
    await syncTmdb(db.client, 1);
    const film = db.tables.films.find((f) => f.tmdb_id === 1)!;
    Object.assign(film, { synopsis: "Sửa tay", director: "Sửa tay", locked_fields: ["synopsis", "cast"] });
    db.tables.film_cast.find((c) => c.film_id === film.id && c.position === 0)!.name = "Sửa tay";
    await syncTmdb(db.client, 1);
    expect(film).toMatchObject({ synopsis: "Sửa tay", director: "Đạo diễn" });
    expect(db.tables.film_cast.find((c) => c.film_id === film.id && c.position === 0)!.name).toBe("Sửa tay");
  });

  it("phim rời rạp bị bỏ trạng thái, trừ phim khóa status", async () => {
    const db = fakeDb();
    tmdb = { nowPlaying: [1, 2, 3], popular: [], titles: { 1: "Một", 2: "Hai", 3: "Ba" } };
    await syncTmdb(db.client, 1);
    const byId = (id: number) => db.tables.films.find((f) => f.tmdb_id === id)!;
    byId(2).locked_fields = ["status"];
    tmdb.nowPlaying = [1];
    expect(await syncTmdb(db.client, 1)).toMatchObject({ cleared: 1 });
    expect([byId(1).status, byId(2).status, byId(3).status]).toEqual(["now_showing", "now_showing", null]);
  });

  it("không ghi đè điểm và số lượt chấm", async () => {
    const db = fakeDb();
    await syncTmdb(db.client, 1);
    const film = db.tables.films[0];
    Object.assign(film, { site_score: 8.5, vote_count: 3, imdb_score: 7.1 });
    await syncTmdb(db.client, 1);
    expect(film).toMatchObject({ site_score: 8.5, vote_count: 3, imdb_score: 7.1 });
  });

  it("một phim lỗi không chặn phim khác, lỗi không chứa khóa", async () => {
    const db = fakeDb();
    tmdb.popular = [2, 9];
    const result = await syncTmdb(db.client, 1);
    expect(result.inserted).toBe(2);
    expect(result.failed).toEqual(["movie/9: TMDB /movie/9: HTTP 404"]);
  });

  it("hai phim mới trùng tên và năm đều vào được ngay lần đầu", async () => {
    const db = fakeDb();
    tmdb = { nowPlaying: [1], popular: [2], titles: { 1: "Trùng Tên", 2: "Trùng Tên" } };
    expect(await syncTmdb(db.client, 1)).toMatchObject({ inserted: 2, failed: [] });
    const slugs = db.tables.films.map((f) => f.slug as string).sort();
    expect(slugs[0]).toBe("trung-ten-2026");
    expect(slugs[1]).toMatch(/^trung-ten-2026-[12]$/);
  });
});
