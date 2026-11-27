import { describe, expect, it } from "vitest";
import { canPostContent, CONTENT_OFF_MESSAGE, isPostingOff } from "@/lib/content";
import { nameFormatError, nameSaveError, normalizeName } from "@/lib/display-name";
import { movieJsonLd, reviewJsonLd, serializeJsonLd } from "@/lib/jsonld";
import { FILMS, REVIEWS } from "@/lib/data/sample";
import { fullReview } from "@/lib/premium";
import { excerpt, otherTitle, safeNext, slugify, smallPoster, starFill, unaccent, youtubeId } from "@/lib/text";
import { filmSlug, toCast, toFilm, withoutLocked } from "@/lib/tmdb";
import { config as sessionRefresh } from "@/proxy";

describe("text", () => {
  it("tạo slug tiếng Việt", () => {
    expect(slugify("Bố Già: Đặc Biệt!")).toBe("bo-gia-dac-biet");
    expect(unaccent("ĐƯỜNG")).toBe("duong");
  });
  it("cắt đoạn trích và bỏ Markdown", () => {
    expect(excerpt("**Hay** [link](https://x.y)")).toBe("Hay link");
    expect(excerpt("a ".repeat(200)).length).toBeLessThanOrEqual(160);
  });
  it.each(["//evil.com", "/\\evil.com", "https://evil.com", "javascript:alert(1)", "/a\\b", "/\t/evil.com", "", null])(
    "chặn chuyển hướng ra ngoài: %s",
    (v) => expect(safeNext(v)).toBe("/"),
  );
  it("cho phép đường dẫn nội bộ", () => expect(safeNext("/phim/a?x=1")).toBe("/phim/a?x=1"));
  it("chỉ nhận link YouTube", () => {
    expect(youtubeId("https://www.youtube.com/watch?v=dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
    expect(youtubeId("https://evil.com/watch?v=dQw4w9WgXcQ")).toBeNull();
  });
});

describe("tmdb", () => {
  const detail = {
    id: 5,
    title: "Bố Già",
    original_title: "Dad",
    release_date: "2021-03-05",
    overview: "",
    poster_path: "/p.jpg",
    genres: [{ id: 18 }, { id: 35 }],
    production_countries: [{ iso_3166_1: "VN" }],
    credits: { cast: [{ name: "A", character: "B", profile_path: null }], crew: [{ name: "Đ", job: "Director" }, { name: "X", job: "Writer" }] },
    videos: { results: [{ site: "Vimeo", type: "Trailer", key: "v" }, { site: "YouTube", type: "Trailer", key: "abc" }] },
    "watch/providers": { results: { VN: { flatrate: [{}] } } },
  };
  it("chuyển đúng cột, không bịa điểm IMDb", () => {
    const f = toFilm("movie", detail, null);
    expect(f).toMatchObject({
      title: "Bố Già", year: 2021, director: "Đ", genres: ["Hài", "Chính kịch"], country: "Việt Nam",
      status: "streaming", total_episodes: 1, synopsis: null,
      poster_url: "https://image.tmdb.org/t/p/w500/p.jpg", trailer_url: "https://www.youtube.com/watch?v=abc",
    });
    expect(f).not.toHaveProperty("imdb_score");
    expect(f).not.toHaveProperty("site_score");
    expect(toCast(detail)).toEqual([{ position: 0, name: "A", role: "B", avatar_url: null }]);
  });
  it("trạng thái rạp ưu tiên hơn streaming", () => expect(toFilm("movie", detail, "now_showing").status).toBe("now_showing"));
  it("slug trùng hoặc tên không có chữ Latin", () => {
    const f = toFilm("movie", detail, null);
    expect(filmSlug(f, () => false)).toBe("bo-gia-2021");
    expect(filmSlug(f, () => true)).toBe("bo-gia-2021-5");
    expect(filmSlug({ ...f, title: "映画", original_title: "映画", year: null }, () => false)).toBe("phim");
  });
  it("không ghi đè cột đã khóa", () => {
    const f = withoutLocked(toFilm("movie", detail, null), ["title", "synopsis"]);
    expect(f).not.toHaveProperty("title");
    expect(f).toHaveProperty("year");
  });
});

describe("JSON-LD", () => {
  it("bỏ AggregateRating khi chưa có lượt chấm", () => {
    const none = FILMS.find((f) => f.vote_count === 0)!;
    const some = FILMS.find((f) => f.vote_count > 0)!;
    expect(movieJsonLd(none, []).aggregateRating).toBeUndefined();
    expect(movieJsonLd(some, []).aggregateRating).toMatchObject({ ratingCount: some.vote_count });
  });
  it("bài bị khóa: không có thân bài, đánh dấu không đọc miễn phí", () => {
    const open = { ...REVIEWS[0], spoiler: false, locked: false };
    expect(reviewJsonLd(open).reviewBody).toBeTruthy();
    expect(reviewJsonLd(open)).not.toHaveProperty("isAccessibleForFree", false);
    const locked = reviewJsonLd({ ...open, locked: true });
    expect(locked.reviewBody).toBeUndefined();
    expect(locked.isAccessibleForFree).toBe(false);
    expect(movieJsonLd(FILMS[0], [{ ...open, locked: true }]).review?.[0].reviewBody).toBeUndefined();
  });
  it("không cho nội dung đóng thẻ script", () => {
    expect(serializeJsonLd({ a: "</script><script>alert(1)</script>" })).not.toContain("<");
  });
});

describe("công tắc nội dung", () => {
  it("chỉ coi là tắt khi database trả đúng false", () => {
    expect(isPostingOff({ data: false, error: null })).toBe(true);
    expect(isPostingOff({ data: true, error: null })).toBe(false);
    expect(isPostingOff({ data: null, error: null })).toBe(false);
  });
  it("lỗi đọc cờ thì không tự khóa giao diện, database vẫn chặn", () => {
    expect(isPostingOff({ data: false, error: { message: "mất mạng" } })).toBe(false);
  });
  it("hỏi đúng hàm can_post_content", async () => {
    const asked: string[] = [];
    const db = (data: boolean) => ({
      rpc: async (fn: "can_post_content") => {
        asked.push(fn);
        return { data, error: null };
      },
    });
    expect(await canPostContent(db(false))).toBe(false);
    expect(await canPostContent(db(true))).toBe(true);
    expect(asked).toEqual(["can_post_content", "can_post_content"]);
  });
});

describe("tên hiển thị", () => {
  it("gom khoảng trắng thừa và chuẩn hóa dấu", () => {
    expect(normalizeName("  Minh \t  Anh \n")).toBe("Minh Anh");
    expect(normalizeName("Mi\u0300nh")).toBe("M\u00ecnh");
  });
  it.each(["Minh Anh", "Đỗ Thị Hà", "An", "a".repeat(30)])("nhận: %s", (v) => expect(nameFormatError(v)).toBeNull());
  it.each(["", "A", "a".repeat(31)])("sai độ dài: '%s'", (v) => expect(nameFormatError(v)).toMatch(/2 đến 30/));
  it.each(["minh_anh", "Minh <b>", "\u0410nh", "Minh\u0301\u0301"])("sai ký tự: %s", (v) =>
    expect(nameFormatError(v)).toMatch(/chữ cái, số/),
  );
  it.each([
    [{ code: "23505", message: 'duplicate key value violates unique constraint "profiles_display_name_key"' }, /đã có người dùng/],
    [{ code: "23514", message: "display_name_reserved" }, /không được dùng/],
    [{ code: "23514", message: "display_name_locked" }, /không đổi được/],
    [{ code: "23514", message: 'violates check constraint "profiles_display_name_format"' }, /chữ cái, số/],
    [{ code: "XX000", message: "lỗi lạ" }, /vui lòng thử lại/],
  ])("đổi lỗi database thành câu dễ hiểu: %o", (error, text) => expect(nameSaveError(error)).toMatch(text));
  it("công tắc tắt dùng đúng câu thông báo chung", () => {
    expect(nameSaveError({ code: "23514", message: "display_name_off" })).toBe(CONTENT_OFF_MESSAGE);
  });
});

describe("bài Premium", () => {
  type Result = { data: unknown; error: unknown };
  const db = (answers: Record<string, Result>) => {
    const asked: string[] = [];
    return {
      asked,
      rpc: async (fn: "can_read_review" | "review_body", args: { target: string }) => {
        asked.push(`${fn} ${args.target}`);
        return answers[fn];
      },
    };
  };
  const ok = (data: unknown): Result => ({ data, error: null });

  it("có quyền thì lấy nội dung đầy đủ", async () => {
    const client = db({ can_read_review: ok(true), review_body: ok("Toàn bộ bài") });
    expect(await fullReview(client, "bai-1")).toBe("Toàn bộ bài");
    expect(client.asked).toEqual(["can_read_review bai-1", "review_body bai-1"]);
  });
  it("không có quyền thì không lấy đoạn trích thay cho bài", async () => {
    const client = db({ can_read_review: ok(false), review_body: ok("đoạn trích") });
    expect(await fullReview(client, "bai-1")).toBeNull();
    expect(client.asked).toHaveLength(1);
  });
  it("lỗi hoặc không có dữ liệu thì coi như chưa đọc được", async () => {
    const failed = { data: null, error: { message: "mất mạng" } };
    expect(await fullReview(db({ can_read_review: failed, review_body: ok("x") }), "a")).toBeNull();
    expect(await fullReview(db({ can_read_review: ok(true), review_body: failed }), "a")).toBeNull();
    expect(await fullReview(db({ can_read_review: ok(true), review_body: ok(null) }), "a")).toBeNull();
  });
});

describe("tên gốc của phim", () => {
  it("hiện khi khác tên phim", () => expect(otherTitle("Bố Già", "Dad, I'm Sorry")).toBe("Dad, I'm Sorry"));
  it.each([
    ["Án Mạng Karaoke", "Án Mạng Karaoke"],
    ["Án Mạng Karaoke", "  án mạng   KARAOKE "],
    ["Bố Già", "Bo\u0302\u0301 Gia\u0300"],
    ["Wildwood", null],
    ["Wildwood", ""],
    ["Wildwood", "   "],
  ])("ẩn khi trùng hoặc trống: %s / %s", (title, original) => expect(otherTitle(title, original)).toBeNull());
});

describe("ảnh nhỏ và sao", () => {
  it("đổi ảnh TMDB sang cỡ nhỏ, ảnh nguồn khác giữ nguyên", () => {
    expect(smallPoster("https://image.tmdb.org/t/p/w500/abc.jpg")).toBe("https://image.tmdb.org/t/p/w185/abc.jpg");
    expect(smallPoster("https://example.com/t/w500.jpg")).toBe("https://example.com/t/w500.jpg");
    expect(smallPoster(null)).toBeNull();
  });
  it.each([
    [10, 100],
    [7, 70],
    [8.6, 86],
    [1, 10],
    [0, 0],
    [12, 100],
    [-1, 0],
  ])("điểm %s tô %s phần trăm", (score, percent) => expect(starFill(score)).toBeCloseTo(percent));
});

describe("làm mới phiên đăng nhập", () => {
  it.each(["/phim/:path*", "/review/:path*", "/go/:path*", "/dang-nhap", "/admin/:path*"])("chạy trên %s", (path) => {
    expect(sessionRefresh.matcher).toContain(path);
  });
});
