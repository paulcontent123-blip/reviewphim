import { beforeEach, describe, expect, it, vi } from "vitest";
import { submitReview } from "@/app/actions";

// Database giả: chỉ đủ cho đường đi của submitReview. Quyền thật do database.test.ts kiểm tra.
const fake = vi.hoisted(() => ({
  updated: [] as { slug: string; status: string }[],
  redirect: vi.fn(),
  nameError: null as { code: string; message: string } | null,
  insertError: null as { code: string; message: string } | null,
  names: [] as string[],
  reviewWrites: 0,
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
      from: (table: string) =>
        table === "profiles"
          ? {
              update: (values: { display_name: string }) => ({
                eq: async () => {
                  fake.names.push(values.display_name);
                  return { error: fake.nameError };
                },
              }),
            }
          : {
              update: () => (fake.reviewWrites++, update),
              insert: () => ({
                select: () => ({
                  single: async () => ({ data: fake.insertError ? null : { slug: "bai-moi" }, error: fake.insertError }),
                }),
              }),
            },
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
  beforeEach(() => {
    fake.redirect.mockClear();
    Object.assign(fake, { updated: [], nameError: null, insertError: null, names: [], reviewWrites: 0 });
  });

  const named = (value: string) => {
    const data = form();
    data.set("display_name", value);
    return data;
  };

  it("form có ô tên: lưu tên đã chuẩn hóa rồi mới lưu bài", async () => {
    await submitReview({}, named("  Minh   Anh "));
    expect(fake.names).toEqual(["Minh Anh"]);
    expect(fake.redirect).toHaveBeenCalledWith("/review/bai-moi");
  });

  it("form không có ô tên: không đụng hồ sơ", async () => {
    await submitReview({}, form());
    expect(fake.names).toEqual([]);
  });

  it("tên sai dạng: báo lỗi, không ghi gì", async () => {
    expect(await submitReview({}, named("minh_anh"))).toEqual({ error: expect.stringMatching(/chữ cái, số/) });
    expect([fake.names.length, fake.reviewWrites]).toEqual([0, 0]);
  });

  it("tên đã có người dùng: báo lỗi, bài chưa được lưu", async () => {
    fake.nameError = { code: "23505", message: 'duplicate key value violates unique constraint "profiles_display_name_key"' };
    expect(await submitReview({}, named("Minh Anh"))).toEqual({ error: "Tên này đã có người dùng." });
    expect(fake.reviewWrites).toBe(0);
    expect(fake.redirect).not.toHaveBeenCalled();
  });

  it("database đòi tên khi form không có ô tên: nhắc nhập tên", async () => {
    fake.insertError = { code: "23514", message: "review_needs_display_name" };
    expect(await submitReview({}, form())).toEqual({ error: expect.stringMatching(/tải lại trang/) });
  });

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
