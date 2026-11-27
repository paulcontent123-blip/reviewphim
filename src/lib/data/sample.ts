import { unaccent } from "@/lib/text";
import type { Film, FilmDetail, FilmQuery, Platform, Review, ReviewQuery } from "@/lib/types";

// Phim hư cấu để chạy giao diện khi chưa nối Supabase. Không bao giờ dùng trên production.

const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const NOW = "2026-11-25T00:00:00.000Z";

type Row = [string, string, Film["status"], string[], number, number | null, number, number];
const ROWS: Row[] = [
  ["Đêm Trên Sông Mẫu", "Night on Sample River", "now_showing", ["Chính kịch", "Bí ẩn"], 2026, 8.6, 12, 1],
  ["Biệt Đội Giả Định", "Placeholder Squad", "now_showing", ["Hành động", "Phiêu lưu"], 2026, 7.9, 30, 1],
  ["Căn Nhà Số Không", "House Zero", "now_showing", ["Kinh dị"], 2026, 7.1, 8, 1],
  ["Mùa Gió Thử Nghiệm", "Test Season", "coming_soon", ["Lãng mạn"], 2027, null, 0, 1],
  ["Hành Tinh Ví Dụ", "Example Planet", "coming_soon", ["Khoa học viễn tưởng"], 2027, null, 0, 1],
  ["Phố Cũ Mười Sáu Tập", "Old Street", "streaming", ["Chính kịch", "Gia đình"], 2025, 9.1, 41, 16],
  ["Mèo Máy Bản Nháp", "Draft Cat", "streaming", ["Hoạt hình", "Hài"], 2024, 8.2, 19, 12],
  ["Vụ Án Minh Họa", "Illustrated Case", "streaming", ["Hình sự", "Giật gân"], 2025, 8.8, 22, 1],
];

const slugOf = (title: string, year: number) => `${unaccent(title).replace(/[^a-z0-9]+/g, "-")}-${year}`;

export const FILMS: FilmDetail[] = ROWS.map(([title, original, status, genres, year, score, votes, eps], i) => {
  const id = uuid(i + 1);
  const platforms: Platform[] = status === "streaming" ? ["vieon", "fptplay", "netflix"] : status === "now_showing" ? ["cgv"] : [];
  return {
    id,
    slug: slugOf(title, year),
    title,
    original_title: original,
    poster_url: null,
    backdrop_url: null,
    genres,
    year,
    country: "Việt Nam",
    imdb_score: null,
    site_score: score,
    vote_count: votes,
    director: "Đạo diễn Mẫu",
    synopsis: `${title} là phim hư cấu dùng để kiểm tra giao diện. Nội dung thật sẽ có sau khi nối Supabase và đồng bộ TMDB.`,
    trailer_url: null,
    status,
    total_episodes: eps,
    updated_at: NOW,
    cast: ["Diễn viên A", "Diễn viên B", "Diễn viên C"].map((name, k) => ({ name, role: `Vai ${k + 1}`, avatar_url: null })),
    watch_options: platforms.map((platform, k) => ({
      id: uuid((i + 1) * 100 + k),
      film_id: id,
      platform,
      url: "https://example.com/",
      type: platform === "cgv" ? "buy" : "subscription",
      quality: platform === "netflix" ? "4K" : "FHD",
      label: platform === "cgv" ? null : "Vietsub",
    })),
  };
});

export const REVIEWS: Review[] = [0, 5, 7, 1].map((idx, i) => {
  const f = FILMS[idx];
  return {
    id: uuid(9000 + i),
    slug: `${f.slug}-${String(i + 1).repeat(8)}`,
    title: `${f.title}: bài review mẫu`,
    content: `Đây là **bài review mẫu** để kiểm tra giao diện.\n\n## Điểm cộng\n\n- Nhịp phim ổn định\n- Âm thanh tốt\n\n## Điểm trừ\n\nĐoạn kết hơi vội. Bài thật sẽ do biên tập và người dùng viết.`,
    score: 8 + i * 0.5,
    spoiler: i === 2,
    tags: ["mau"],
    likes: 4 - i,
    published_at: NOW,
    film_id: f.id,
    film_slug: f.slug,
    film_title: f.title,
    film_poster_url: null,
    film_genres: f.genres,
    film_year: f.year,
    author_name: "tac_gia_mau",
    author_avatar_url: null,
    author_role: "reviewer",
    locked: false,
  };
});

export function sampleFilms(q: FilmQuery): Film[] {
  const term = q.q ? unaccent(q.q) : "";
  const list = FILMS.filter(
    (f) =>
      (!q.status || f.status === q.status) &&
      (q.sort !== "score" || f.vote_count > 0) &&
      (!q.genre || f.genres?.includes(q.genre)) &&
      (!q.year || f.year === q.year) &&
      (!term || unaccent(`${f.title} ${f.original_title}`).includes(term)),
  );
  if (q.sort === "score") list.sort((a, b) => (b.site_score ?? 0) - (a.site_score ?? 0));
  return list.slice(0, q.limit ?? 24);
}

export function sampleReviews(q: ReviewQuery): Review[] {
  return REVIEWS.filter(
    (r) =>
      (!q.filmId || r.film_id === q.filmId) &&
      (!q.genre || r.film_genres?.includes(q.genre)) &&
      (!q.minScore || r.score >= q.minScore),
  ).slice(0, q.limit ?? 20);
}
