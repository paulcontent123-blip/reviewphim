// Dữ liệu thử của E2E trên Supabase thật. Khóa secret chỉ dùng ở đây (Node), không đưa vào trình duyệt.
import { randomUUID } from "node:crypto";

const FILM_SLUG = /^e2e-[0-9a-f]{8}$/;
const USER_EMAIL = /^e2e-[0-9a-f]{8}(-admin)?@example\.com$/;
const STALE_MS = 60 * 60 * 1000;

export interface TestData {
  email: string;
  password: string;
  userId: string;
  filmId: string;
  filmSlug: string;
  optionId: string;
  watchUrl: string;
  runId: string;
  /** Tài khoản admin tạm, xóa cùng lần chạy. */
  admin: { id: string; email: string; password: string };
}

function env(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`E2E dừng: thiếu biến môi trường ${name}.`);
  return value;
}

/** Chỉ cho ghi vào project được khai báo rõ, để không lỡ ghi dữ liệu thử vào production. */
export function assertAllowedProject(): void {
  const url = env("NEXT_PUBLIC_SUPABASE_URL");
  const ref = env("E2E_PROJECT_REF");
  env("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  env("SUPABASE_SERVICE_ROLE_KEY");
  if (!URL.canParse(url) || new URL(url).hostname !== `${ref}.supabase.co`) {
    throw new Error("E2E dừng: E2E_PROJECT_REF không khớp project trong NEXT_PUBLIC_SUPABASE_URL.");
  }
}

async function call<T>(method: string, path: string, body?: unknown, key = env("SUPABASE_SERVICE_ROLE_KEY")): Promise<T> {
  const res = await fetch(env("NEXT_PUBLIC_SUPABASE_URL") + path, {
    method,
    headers: { apikey: key, "content-type": "application/json", prefer: "return=representation" },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(30_000),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Supabase ${method} ${path.split("?")[0]}: HTTP ${res.status} ${text.slice(0, 200)}`);
  return (text ? JSON.parse(text) : null) as T;
}

export const rows = <T>(query: string) => call<T[]>("GET", `/rest/v1/${query}`);
const drop = (query: string) => call("DELETE", `/rest/v1/${query}`);

export async function assertPostingOn(): Promise<void> {
  const on = await call<boolean>("POST", "/rest/v1/rpc/can_post_content", {}, env("NEXT_PUBLIC_SUPABASE_ANON_KEY"));
  if (!on) throw new Error("E2E dừng: công tắc nội dung đang tắt (site_settings.ugc_enabled). Test không tự đổi công tắc.");
}

type Item = { name: string; createdAt: string };

/** Xóa phim và tài khoản thử thỏa điều kiện, cùng lượt click và review của chúng. */
async function remove(match: (item: Item) => boolean): Promise<void> {
  const films = await rows<{ id: string; slug: string; created_at: string }>("films?select=id,slug,created_at&slug=like.e2e-*");
  for (const f of films) {
    if (!FILM_SLUG.test(f.slug) || !match({ name: f.slug, createdAt: f.created_at })) continue;
    await drop(`affiliate_clicks?film_id=eq.${f.id}`);
    await drop(`reviews?film_id=eq.${f.id}`);
    await drop(`films?id=eq.${f.id}`);
  }
  const { users } = await call<{ users: { id: string; email?: string; created_at: string }[] }>(
    "GET",
    "/auth/v1/admin/users?per_page=1000",
  );
  for (const u of users) {
    if (!u.email || !USER_EMAIL.test(u.email) || !match({ name: u.email, createdAt: u.created_at })) continue;
    await drop(`affiliate_clicks?user_id=eq.${u.id}`);
    await drop(`reviews?author_id=eq.${u.id}`);
    await call("DELETE", `/auth/v1/admin/users/${u.id}`);
  }
}

export const removeRun = (runId: string) => remove((i) => i.name.includes(runId));
/** Dọn dữ liệu còn sót từ lần chạy bị ngắt; chừa lần chạy mới hơn một giờ. */
export const removeStale = () => remove((i) => Date.parse(i.createdAt) < Date.now() - STALE_MS);

export async function createTestData(runId: string): Promise<TestData> {
  const email = `e2e-${runId}@example.com`;
  const password = randomUUID();
  const filmSlug = `e2e-${runId}`;
  const watchUrl = `https://example.com/?e2e=${runId}`;
  const user = await call<{ id: string }>("POST", "/auth/v1/admin/users", { email, password, email_confirm: true });
  const [film] = await call<{ id: string }[]>("POST", "/rest/v1/films", { slug: filmSlug, title: `[E2E] Phim thử ${runId}` });
  const [option] = await call<{ id: string }[]>("POST", "/rest/v1/watch_options", {
    film_id: film.id,
    platform: "other",
    url: watchUrl,
    type: "free",
  });
  const admin = await createAdmin(runId);
  return { email, password, userId: user.id, filmId: film.id, filmSlug, optionId: option.id, watchUrl, runId, admin };
}

async function createAdmin(runId: string) {
  const email = `e2e-${runId}-admin@example.com`;
  const password = randomUUID();
  const { id } = await call<{ id: string }>("POST", "/auth/v1/admin/users", { email, password, email_confirm: true });
  await call("PATCH", `/rest/v1/profiles?id=eq.${id}&select=id`, { role: "admin", display_name: `E2E Admin ${runId}` });
  return { id, email, password };
}

/** Bài review tạo sẵn bằng khóa secret, trả về slug. */
export async function seedReview(authorId: string, filmId: string, title: string): Promise<string> {
  const content = "Bài do test tự động tạo để thử ẩn và hiện lại, đủ dài hơn năm mươi ký tự.";
  const [review] = await call<{ slug: string }[]>("POST", "/rest/v1/reviews?select=slug", {
    film_id: filmId,
    author_id: authorId,
    score: 7,
    title,
    content,
  });
  return review.slug;
}

/** Dữ liệu do global-setup tạo, truyền sang tiến trình chạy test qua biến môi trường. */
export const testData = () => JSON.parse(env("E2E_DATA")) as TestData;
