/** Thể loại dùng chung cho URL /the-loai/[slug] và cột films.genres; tmdb là id phim lẻ và phim bộ. */
export const GENRES = [
  { slug: "hanh-dong", name: "Hành động", tmdb: [28, 10759] },
  { slug: "phieu-luu", name: "Phiêu lưu", tmdb: [12] },
  { slug: "hoat-hinh", name: "Hoạt hình", tmdb: [16] },
  { slug: "hai", name: "Hài", tmdb: [35] },
  { slug: "hinh-su", name: "Hình sự", tmdb: [80] },
  { slug: "tai-lieu", name: "Tài liệu", tmdb: [99] },
  { slug: "chinh-kich", name: "Chính kịch", tmdb: [18] },
  { slug: "gia-dinh", name: "Gia đình", tmdb: [10751, 10762] },
  { slug: "gia-tuong", name: "Giả tưởng", tmdb: [14, 10765] },
  { slug: "lich-su", name: "Lịch sử", tmdb: [36] },
  { slug: "kinh-di", name: "Kinh dị", tmdb: [27] },
  { slug: "am-nhac", name: "Âm nhạc", tmdb: [10402] },
  { slug: "bi-an", name: "Bí ẩn", tmdb: [9648] },
  { slug: "lang-man", name: "Lãng mạn", tmdb: [10749, 10766] },
  { slug: "khoa-hoc-vien-tuong", name: "Khoa học viễn tưởng", tmdb: [878, 10765] },
  { slug: "giat-gan", name: "Giật gân", tmdb: [53] },
  { slug: "chien-tranh", name: "Chiến tranh", tmdb: [10752, 10768] },
  { slug: "mien-tay", name: "Miền Tây", tmdb: [37] },
] as const;

export const genreBySlug = (slug: string) => GENRES.find((g) => g.slug === slug);
export const genreByName = (name: string) => GENRES.find((g) => g.name === name);

export function genresFromTmdb(ids: number[]): string[] {
  return GENRES.filter((g) => g.tmdb.some((id) => ids.includes(id))).map((g) => g.name);
}
