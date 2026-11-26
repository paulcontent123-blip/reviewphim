import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { beforeAll, describe, expect, it } from "vitest";

const A = "a1111111-1111-4111-8111-111111111111";
const B = "b2222222-2222-4222-8222-222222222222";
const LONG = "Nội dung review đủ dài để vượt qua giới hạn tối thiểu năm mươi ký tự của bảng.";

let db: PGlite;
let film: string;

// Giả lập các vai trò và hàm mà Supabase có sẵn.
const SUPABASE_STUB = `
  create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
  create schema auth;
  create table auth.users (id uuid primary key);
  create function auth.uid() returns uuid language sql stable as
    $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  grant usage on schema auth, public to anon, authenticated, service_role;
  grant execute on function auth.uid() to anon, authenticated, service_role;
  alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
`;

async function as<T = Record<string, unknown>>(role: string, uid: string | null, sql: string, params: unknown[] = []) {
  return db.transaction(async (tx) => {
    await tx.query("select set_config('request.jwt.claim.sub', $1, true)", [uid ?? ""]);
    await tx.exec(`set local role ${role}`);
    return (await tx.query<T>(sql, params)).rows;
  });
}
const anon = (sql: string, p?: unknown[]) => as("anon", null, sql, p);
const user = (uid: string, sql: string, p?: unknown[]) => as("authenticated", uid, sql, p);

beforeAll(async () => {
  db = new PGlite();
  await db.exec(SUPABASE_STUB);
  for (const f of ["0001_techspec", "0002_phase1"]) {
    await db.exec(readFileSync(`supabase/migrations/${f}.sql`, "utf8"));
  }
  await db.query("insert into auth.users values ($1), ($2)", [A, B]);
  const r = await db.query<{ id: string }>(
    "insert into films (slug, title, original_title) values ('bo-gia-2021', 'Bố Già: Đặc Biệt', 'Dad') returning id",
  );
  film = r.rows[0].id;
  await db.query("insert into watch_options (film_id, platform, url) values ($1, 'vieon', 'https://example.com')", [film]);
}, 60000);

describe("catalog", () => {
  it("khách đọc được phim nhưng không ghi được", async () => {
    expect(await anon("select slug from films")).toEqual([{ slug: "bo-gia-2021" }]);
    await expect(anon("insert into films (slug, title) values ('x', 'x')")).rejects.toThrow(/permission denied/);
    await expect(user(A, "update films set title = 'x'")).rejects.toThrow(/permission denied/);
  });

  it("tìm được khi gõ không dấu", async () => {
    expect(await anon("select slug from films where search_text ilike '%bo gia: dac biet%'")).toHaveLength(1);
  });

  it("chỉ nhận link https và nền tảng trong spec", async () => {
    const ins = "insert into watch_options (film_id, platform, url) values ($1, $2, $3)";
    await expect(db.query(ins, [film, "vieon", "javascript:alert(1)"])).rejects.toThrow(/url_https/);
    await expect(db.query(ins, [film, "lau", "https://example.com"])).rejects.toThrow(/platform/);
  });
});

describe("profiles", () => {
  it("tự tạo khi đăng ký và không lộ hoa hồng", async () => {
    expect(await anon("select role from profiles where id = $1", [A])).toEqual([{ role: "viewer" }]);
    await expect(anon("select total_commission from profiles")).rejects.toThrow(/permission denied/);
    await expect(user(A, "select affiliate_code from profiles")).rejects.toThrow(/permission denied/);
  });

  it("không tự nâng quyền, không sửa hồ sơ người khác", async () => {
    await expect(user(A, "update profiles set role = 'admin' where id = $1", [A])).rejects.toThrow(/permission denied/);
    expect(await user(A, "update profiles set username = 'hacked' where id = $1 returning id", [B])).toEqual([]);
    expect(await user(A, "update profiles set username = 'minh_a' where id = $1 returning id", [A])).toHaveLength(1);
  });
});

describe("reviews", () => {
  const rate = "insert into reviews (film_id, author_id, score) values ($1, $2, $3)";
  const score = async () =>
    (await db.query<{ site_score: string; vote_count: number }>("select site_score, vote_count from films where id = $1", [film])).rows[0];

  it("khách không chấm điểm được, không mạo danh được", async () => {
    await expect(anon(rate, [film, A, 8])).rejects.toThrow(/permission denied/);
    await expect(user(A, rate, [film, B, 8])).rejects.toThrow(/row-level security/);
  });

  it("chấm điểm cập nhật site_score, không bấm trùng, đúng khoảng 1–10", async () => {
    await user(A, rate, [film, A, 8]);
    await user(B, rate, [film, B, 9]);
    expect(Number((await score()).site_score)).toBe(8.5);
    expect((await score()).vote_count).toBe(2);
    await expect(user(A, rate, [film, A, 1])).rejects.toThrow(/reviews_one_per_user/);
    await expect(user(A, "update reviews set score = 11 where author_id = $1", [A])).rejects.toThrow(/score_range/);
  });

  it("điểm nhanh không hiện thành bài; thêm nội dung thì có slug", async () => {
    expect(await anon("select id from review_feed")).toHaveLength(0);
    await user(A, "update reviews set title = 'Phim rất hay', content = $1 where author_id = $2", [LONG, A]);
    const feed = await anon("select slug, author_name, film_slug from review_feed");
    expect(feed).toHaveLength(1);
    expect(feed[0]).toMatchObject({ author_name: "minh_a", film_slug: "bo-gia-2021" });
    expect(feed[0].slug).toMatch(/^bo-gia-2021-[0-9a-f]{8}$/);
  });

  it("không tự sửa likes, status; không sửa bài người khác", async () => {
    await expect(user(A, "update reviews set likes = 999 where author_id = $1", [A])).rejects.toThrow(/permission denied/);
    await expect(user(A, "update reviews set status = 'hidden'")).rejects.toThrow(/permission denied/);
    expect(await user(B, "update reviews set title = 'Bị sửa trộm' where author_id = $1 returning id", [A])).toEqual([]);
    expect(await user(B, "delete from reviews where author_id = $1 returning id", [A])).toEqual([]);
  });

  it("like đếm đúng và chỉ một lần mỗi người", async () => {
    const [{ id }] = (await anon("select id from review_feed")) as { id: string }[];
    const like = "insert into review_likes (user_id, review_id) values ($1, $2)";
    await user(B, like, [B, id]);
    await expect(user(B, like, [B, id])).rejects.toThrow(/duplicate key/);
    await expect(user(B, like, [A, id])).rejects.toThrow(/row-level security/);
    expect(await anon("select likes from review_feed")).toEqual([{ likes: 1 }]);
    await user(B, "delete from review_likes where review_id = $1", [id]);
    expect(await anon("select likes from review_feed")).toEqual([{ likes: 0 }]);
  });

  it("bài bị ẩn biến mất với người khác và không tính điểm", async () => {
    await db.query("update reviews set status = 'hidden' where author_id = $1", [A]);
    expect(await anon("select id from review_feed")).toHaveLength(0);
    expect(await user(A, "select id from reviews where author_id = $1", [A])).toHaveLength(1);
    expect(Number((await score()).site_score)).toBe(9);
    await db.query("update reviews set status = 'published' where author_id = $1", [A]);
  });
});

describe("dữ liệu riêng tư", () => {
  it("watchlist chỉ chủ tài khoản thấy", async () => {
    await user(A, "insert into watchlist (user_id, film_id) values ($1, $2)", [A, film]);
    expect(await user(A, "select film_id from watchlist")).toHaveLength(1);
    expect(await user(B, "select film_id from watchlist")).toHaveLength(0);
    await expect(anon("select film_id from watchlist")).rejects.toThrow(/permission denied/);
  });

  it("lượt click chỉ service_role truy cập được", async () => {
    await expect(user(A, "select id from affiliate_clicks")).rejects.toThrow(/permission denied/);
    await expect(anon("insert into affiliate_clicks (platform) values ('vieon')")).rejects.toThrow(/permission denied/);
    await as("service_role", null, "insert into affiliate_clicks (film_id, user_id, platform) values ($1, $2, 'vieon')", [film, A]);
  });

  it("mọi bảng public đều bật RLS", async () => {
    const r = await db.query("select relname from pg_class where relnamespace = 'public'::regnamespace and relkind = 'r' and not relrowsecurity");
    expect(r.rows).toEqual([]);
  });

  it("xóa tài khoản thì xóa dữ liệu cá nhân, giữ lượt click ẩn danh", async () => {
    await db.query("delete from auth.users where id = $1", [A]);
    expect((await db.query("select 1 from reviews where author_id = $1", [A])).rows).toEqual([]);
    expect((await db.query("select user_id from affiliate_clicks")).rows).toEqual([{ user_id: null }]);
  });
});
