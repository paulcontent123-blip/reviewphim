import { beforeEach, describe, expect, it, vi } from "vitest";
import { deleteLink, saveLink, setReviewStatus } from "@/app/admin/actions";
import { adminError, parseLink } from "@/lib/admin";

// Database giả cho server action. Quyền thật do database.test.ts kiểm tra.
const fake = vi.hoisted(() => ({
  returned: [{ id: "x" }] as { id: string }[],
  error: null as { code: string; message: string } | null,
  calls: [] as { action: string; values?: unknown }[],
  rpc: { data: [{ review_slug: "bai-a", film_slug: "phim-a" }] as unknown, error: null as { code: string; message: string } | null },
  revalidated: [] as string[],
}));

vi.mock("next/cache", () => ({ revalidatePath: (path: string) => fake.revalidated.push(path) }));
vi.mock("@/lib/env", () => ({ hasSupabase: true }));
vi.mock("@/lib/supabase/server", () => {
  const result = async () => ({ data: fake.error ? null : fake.returned, error: fake.error });
  const chain = { eq: () => chain, select: result };
  const record = (action: string) => (values?: unknown) => {
    fake.calls.push({ action, values });
    return chain;
  };
  return {
    sessionClient: () => ({
      from: () => ({ insert: record("insert"), update: record("update"), delete: record("delete") }),
      rpc: async (fn: string, args: unknown) => {
        fake.calls.push({ action: fn, values: args });
        return fake.rpc;
      },
    }),
  };
});

const FILM = "b2222222-2222-4222-8222-222222222222";
const OPTION = "c3333333-3333-4333-8333-333333333333";
function form(values: Record<string, string>) {
  const data = new FormData();
  for (const [k, v] of Object.entries(values)) data.set(k, v);
  return data;
}
const link = (over: Record<string, string> = {}) =>
  form({ film_id: FILM, film_slug: "phim-a", platform: "vieon", url: "https://vieon.vn/phim", type: "", quality: "", label: "", ...over });

describe("parseLink", () => {
  it("nhận link hợp lệ, ô trống thành null", () => {
    expect(parseLink(link({ url: "  HTTPS://VieON.vn/Phim?a=1 ", label: "  Vietsub " }))).toEqual({
      values: { platform: "vieon", url: "https://vieon.vn/Phim?a=1", type: null, quality: null, label: "Vietsub" },
    });
    expect(parseLink(link({ type: "rent", quality: "4K" }))).toMatchObject({ values: { type: "rent", quality: "4K" } });
  });
  it.each([
    ["nền tảng lạ", { platform: "lau" }, /nền tảng/],
    ["thiếu địa chỉ", { url: "" }, /https/],
    ["http", { url: "http://vieon.vn" }, /https/],
    ["javascript", { url: "javascript:alert(1)" }, /https/],
    ["không có tên miền", { url: "https://localhost" }, /https/],
    ["có tài khoản trong địa chỉ", { url: "https://a:b@vieon.vn" }, /https/],
    ["địa chỉ quá dài", { url: `https://vieon.vn/${"a".repeat(2000)}` }, /2000/],
    ["hình thức lạ", { type: "gift" }, /hình thức/],
    ["chất lượng lạ", { quality: "8K" }, /chất lượng/],
    ["ghi chú quá dài", { label: "a".repeat(61) }, /60/],
  ])("từ chối %s", (_name, over, message) => {
    expect(parseLink(link(over))).toEqual({ error: expect.stringMatching(message) });
  });
});

describe("adminError", () => {
  it.each([
    [{ code: "42501", message: "admin_only" }, /quyền/],
    [{ code: "42501", message: 'new row violates row-level security policy for table "watch_options"' }, /quyền/],
    [{ code: "P0002", message: "review_not_found" }, /Không tìm thấy bài/],
    [{ code: "XX000", message: "lạ" }, /thử lại/],
  ])("%o", (error, message) => expect(adminError(error)).toMatch(message));
});

describe("server action quản trị", () => {
  beforeEach(() => {
    Object.assign(fake, { returned: [{ id: "x" }], error: null, calls: [], revalidated: [] });
    fake.rpc = { data: [{ review_slug: "bai-a", film_slug: "phim-a" }], error: null };
  });

  it("thêm link: ghi đúng phim và làm mới trang công khai", async () => {
    expect(await saveLink({}, link())).toEqual({ ok: true });
    expect(fake.calls).toEqual([{ action: "insert", values: expect.objectContaining({ film_id: FILM, platform: "vieon" }) }]);
    expect(fake.revalidated).toEqual(expect.arrayContaining(["/", "/phim/phim-a"]));
  });
  it("sửa link: không gửi film_id", async () => {
    await saveLink({}, link({ option_id: OPTION }));
    expect(fake.calls[0].action).toBe("update");
    expect(fake.calls[0].values).not.toHaveProperty("film_id");
  });
  it("dữ liệu sai: không ghi", async () => {
    expect(await saveLink({}, link({ url: "http://a.vn" }))).toHaveProperty("error");
    expect(fake.calls).toEqual([]);
  });
  it("không dòng nào đổi nghĩa là không có quyền hoặc link không còn", async () => {
    fake.returned = [];
    expect(await saveLink({}, link({ option_id: OPTION }))).toEqual({ error: expect.stringMatching(/Không lưu được/) });
    expect(await deleteLink({}, form({ option_id: OPTION, film_slug: "phim-a" }))).toEqual({ error: expect.stringMatching(/Không xóa được/) });
    expect(fake.revalidated).toEqual([]);
  });
  it("xóa link", async () => {
    expect(await deleteLink({}, form({ option_id: OPTION, film_slug: "phim-a" }))).toEqual({ ok: true });
    expect(fake.calls[0].action).toBe("delete");
  });
  it("ẩn bài: gọi hàm database và làm mới trang bài, trang phim", async () => {
    expect(await setReviewStatus({}, form({ review_id: OPTION, status: "hidden" }))).toEqual({ ok: true });
    expect(fake.calls[0]).toEqual({ action: "set_review_status", values: { target: OPTION, new_status: "hidden" } });
    expect(fake.revalidated).toEqual(expect.arrayContaining(["/", "/review", "/review/bai-a", "/phim/phim-a", "/phim/phim-a/review"]));
  });
  it("không phải admin: báo thiếu quyền", async () => {
    fake.rpc = { data: null, error: { code: "42501", message: "admin_only" } };
    expect(await setReviewStatus({}, form({ review_id: OPTION, status: "hidden" }))).toEqual({ error: expect.stringMatching(/quyền/) });
  });
  it("trạng thái lạ hoặc id sai: không gọi database", async () => {
    expect(await setReviewStatus({}, form({ review_id: OPTION, status: "xoa" }))).toHaveProperty("error");
    expect(await setReviewStatus({}, form({ review_id: "1", status: "hidden" }))).toHaveProperty("error");
    expect(fake.calls).toEqual([]);
  });
});
