import { beforeEach, describe, expect, it, vi } from "vitest";
import { submitReview } from "@/app/actions";

// Database giả: chỉ đủ cho đường đi của submitReview. Quyền thật do database.test.ts kiểm tra.
const fake = vi.hoisted(() => ({
  updated: [] as { slug: string; status: string }[],
  redirect: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: fake.redirect }));
vi.mock("@/lib/env", () => ({ hasSupabase: true }));
vi.mock("@/lib/supabase/server", () => {
  const update = { eq: () => update, select: async () => ({ data: fake.updated, error: null }) };
  return {
    sessionClient: () => ({
      auth: { getUser: async () => ({ data: { user: { id: "a1111111-1111-4111-8111-111111111111" } } }) },
      rpc: async () => ({ data: true, error: null }),
      from: () => ({
        update: () => update,
        insert: () => ({ select: () => ({ single: async () => ({ data: { slug: "bai-moi" }, error: null }) }) }),
      }),
    }),
  };
});

function form() {
  const data = new FormData();
  data.set("film_id", "b2222222-2222-4222-8222-222222222222");
  data.set("film_slug", "phim-a");
  data.set("score", "8");
  data.set("title", "Phim xem được");
  data.set("content", "Nội dung review đủ dài để vượt qua giới hạn tối thiểu năm mươi ký tự.");
  return data;
}

describe("submitReview", () => {
  beforeEach(() => fake.redirect.mockClear());

  it("bài đang ẩn: báo đã lưu và ở lại trang, vì trang bài viết sẽ 404", async () => {
    fake.updated = [{ slug: "bai-an", status: "hidden" }];
    expect(await submitReview({}, form())).toEqual({ ok: true, hidden: true });
    expect(fake.redirect).not.toHaveBeenCalled();
  });

  it("sửa bài đang hiển thị: chuyển đến trang bài", async () => {
    fake.updated = [{ slug: "bai-cu", status: "published" }];
    await submitReview({}, form());
    expect(fake.redirect).toHaveBeenCalledWith("/review/bai-cu");
  });

  it("đăng bài mới: chuyển đến trang bài", async () => {
    fake.updated = [];
    await submitReview({}, form());
    expect(fake.redirect).toHaveBeenCalledWith("/review/bai-moi");
  });
});
