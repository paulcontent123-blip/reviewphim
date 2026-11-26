import { describe, expect, it } from "vitest";
import { canPostContent, isPostingOff } from "@/lib/content";
import { movieJsonLd, serializeJsonLd } from "@/lib/jsonld";
import { FILMS } from "@/lib/data/sample";
import { excerpt, safeNext, slugify, unaccent, youtubeId } from "@/lib/text";
import { filmSlug, toCast, toFilm, withoutLocked } from "@/lib/tmdb";

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
