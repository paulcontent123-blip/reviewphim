"use server";

import { revalidatePath } from "next/cache";
import type { ActionState } from "@/app/actions";
import { adminError, parseLink } from "@/lib/admin";
import { hasSupabase } from "@/lib/env";
import { sessionClient } from "@/lib/supabase/server";
import { isUuid } from "@/lib/text";

// Mọi lệnh chạy theo phiên người đăng nhập: database từ chối nếu không phải admin.
const NOT_READY: ActionState = { error: "Chưa nối Supabase nên chưa lưu được." };
const validSlug = (s: string) => /^[a-z0-9-]+$/.test(s);
const text = (form: FormData, key: string) => String(form.get(key) ?? "").trim();

/** Link xem hiện ở trang chủ, trang phim và trang bài review. */
function refreshLinks(filmSlug: string) {
  revalidatePath("/");
  if (validSlug(filmSlug)) revalidatePath(`/phim/${filmSlug}`);
  revalidatePath("/review/[slug]", "page");
  revalidatePath("/admin", "layout");
}

export async function saveLink(_prev: ActionState, form: FormData): Promise<ActionState> {
  if (!hasSupabase) return NOT_READY;
  const parsed = parseLink(form);
  if ("error" in parsed) return { error: parsed.error };
  const filmId = text(form, "film_id");
  const optionId = text(form, "option_id");
  if (!isUuid(filmId) || (optionId && !isUuid(optionId))) return { error: "Không tìm thấy phim." };

  const table = sessionClient().from("watch_options");
  const { data, error } = optionId
    ? await table.update(parsed.values).eq("id", optionId).select("id")
    : await table.insert({ film_id: filmId, ...parsed.values }).select("id");
  if (error) {
    console.error("saveLink", error.message);
    return { error: adminError(error) };
  }
  // Sửa mà không có quyền thì database trả 0 dòng thay vì báo lỗi.
  if (!data?.length) return { error: "Không lưu được: link không còn hoặc bạn không có quyền." };
  refreshLinks(text(form, "film_slug"));
  return { ok: true };
}

export async function deleteLink(_prev: ActionState, form: FormData): Promise<ActionState> {
  if (!hasSupabase) return NOT_READY;
  const optionId = text(form, "option_id");
  if (!isUuid(optionId)) return { error: "Không tìm thấy link." };
  const { data, error } = await sessionClient().from("watch_options").delete().eq("id", optionId).select("id");
  if (error) {
    console.error("deleteLink", error.message);
    return { error: adminError(error) };
  }
  if (!data?.length) return { error: "Không xóa được: link không còn hoặc bạn không có quyền." };
  refreshLinks(text(form, "film_slug"));
  return { ok: true };
}

export async function setReviewStatus(_prev: ActionState, form: FormData): Promise<ActionState> {
  if (!hasSupabase) return NOT_READY;
  const target = text(form, "review_id");
  const status = text(form, "status");
  if (!isUuid(target) || (status !== "hidden" && status !== "published")) return { error: "Yêu cầu không hợp lệ." };
  const { data, error } = await sessionClient().rpc("set_review_status", { target, new_status: status });
  if (error) {
    console.error("setReviewStatus", error.message);
    return { error: adminError(error) };
  }
  const [row] = (data ?? []) as { review_slug: string | null; film_slug: string }[];
  revalidatePath("/");
  revalidatePath("/review");
  if (row?.review_slug) revalidatePath(`/review/${row.review_slug}`);
  if (row && validSlug(row.film_slug)) {
    revalidatePath(`/phim/${row.film_slug}`);
    revalidatePath(`/phim/${row.film_slug}/review`);
  }
  revalidatePath("/admin", "layout");
  return { ok: true };
}
