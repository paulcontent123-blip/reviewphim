import { describe, expect, it, vi } from "vitest";
import { hasWatchOptions } from "@/lib/data";
import { FILMS } from "@/lib/data/sample";

// Chạy ngoài Next: server-only và react cache không có sẵn. Không cấu hình Supabase nên dùng dữ liệu mẫu.
vi.mock("server-only", () => ({}));
vi.mock("react", () => ({ cache: <T>(fn: T) => fn }));

describe("hasWatchOptions", () => {
  it("phim có link xem", async () => {
    const film = FILMS.find((f) => f.watch_options.length > 0)!;
    expect(await hasWatchOptions(film.id)).toBe(true);
  });
  it("phim chưa có link xem, hoặc không tồn tại", async () => {
    const film = FILMS.find((f) => f.watch_options.length === 0)!;
    expect(await hasWatchOptions(film.id)).toBe(false);
    expect(await hasWatchOptions("00000000-0000-4000-8000-000000000000")).toBe(false);
  });
});
