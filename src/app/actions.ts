"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { hasSupabase } from "@/lib/env";
import { sessionClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/text";

export interface ActionState {
  error?: string;
  ok?: boolean;
}

const NOT_READY: ActionState = { error: "Chưa nối Supabase nên chưa lưu được." };
const SIGN_IN: ActionState = { error: "Bạn cần đăng nhập." };
const FAILED: ActionState = { error: "Không lưu được, vui lòng thử lại." };

const validScore = (n: number) => Number.isInteger(n) && n >= 1 && n <= 10;
const validSlug = (s: string) => /^[a-z0-9-]+$/.test(s);

type ReviewValues = { score: number; title?: string; content?: string; spoiler?: boolean; tags?: string[] };

/** Mỗi người một dòng mỗi phim: có rồi thì sửa, chưa có thì thêm. RLS kiểm tra quyền. */
async function saveReview(filmId: string, values: ReviewValues): Promise<{ state: ActionState; slug: string | null }> {
  const db = sessionClient();
  const { data } = await db.auth.getUser();
  if (!data.user) return { state: SIGN_IN, slug: null };

  const updated = await db.from("reviews").update(values).eq("film_id", filmId).eq("author_id", data.user.id).select("slug");
  if (updated.error) {
    console.error("saveReview update", updated.error.message);
    return { state: FAILED, slug: null };
  }
  if (updated.data.length) return { state: { ok: true }, slug: updated.data[0].slug };

  const inserted = await db
    .from("reviews")
    .insert({ film_id: filmId, author_id: data.user.id, ...values })
    .select("slug")
    .single();
  if (inserted.error) {
    console.error("saveReview insert", inserted.error.message);
    return { state: FAILED, slug: null };
  }
  return { state: { ok: true }, slug: inserted.data.slug };
}

function refresh(filmSlug: string) {
  if (!validSlug(filmSlug)) return;
  revalidatePath("/");
  revalidatePath(`/phim/${filmSlug}`);
  revalidatePath(`/phim/${filmSlug}/review`);
}

export async function rateFilm(filmId: string, filmSlug: string, score: number): Promise<ActionState> {
  if (!hasSupabase) return NOT_READY;
  if (!isUuid(filmId) || !validScore(score)) return { error: "Điểm không hợp lệ." };
  const { state, slug } = await saveReview(filmId, { score });
  if (state.ok) {
    refresh(filmSlug);
    if (slug) revalidatePath(`/review/${slug}`);
  }
  return state;
}

export async function submitReview(_prev: ActionState, form: FormData): Promise<ActionState> {
  if (!hasSupabase) return NOT_READY;
  const text = (k: string) => String(form.get(k) ?? "").trim();
  const filmId = text("film_id");
  const score = Number(text("score"));
  const title = text("title");
  const content = text("content");
  const tags = text("tags")
    .split(",")
    .map((t) => t.trim().replace(/^#/, ""))
    .filter(Boolean);

  if (!isUuid(filmId)) return { error: "Không tìm thấy phim." };
  if (!validScore(score)) return { error: "Hãy chọn điểm từ 1 đến 10." };
  if (title.length < 5 || title.length > 150) return { error: "Tiêu đề dài từ 5 đến 150 ký tự." };
  if (content.length < 50 || content.length > 20000) return { error: "Nội dung dài từ 50 đến 20.000 ký tự." };
  if (tags.length > 5 || tags.some((t) => t.length > 30)) return { error: "Tối đa 5 tag, mỗi tag không quá 30 ký tự." };

  const { state, slug } = await saveReview(filmId, { score, title, content, spoiler: form.get("spoiler") === "on", tags });
  if (!state.ok) return state;
  if (!slug) return FAILED;
  refresh(text("film_slug"));
  revalidatePath(`/review/${slug}`);
  redirect(`/review/${slug}`);
}

export async function toggleLike(reviewId: string, reviewSlug: string, like: boolean): Promise<ActionState> {
  if (!hasSupabase) return NOT_READY;
  if (!isUuid(reviewId)) return FAILED;
  const db = sessionClient();
  const { data } = await db.auth.getUser();
  if (!data.user) return SIGN_IN;
  const row = { user_id: data.user.id, review_id: reviewId };
  const { error } = like ? await db.from("review_likes").insert(row) : await db.from("review_likes").delete().match(row);
  // 23505: đã like từ trước, coi như xong.
  if (error && error.code !== "23505") {
    console.error("toggleLike", error.message);
    return FAILED;
  }
  if (validSlug(reviewSlug)) revalidatePath(`/review/${reviewSlug}`);
  return { ok: true };
}
