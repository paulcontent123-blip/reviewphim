/** Bỏ dấu tiếng Việt, khớp với hàm SQL vn_unaccent. */
export function unaccent(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase();
}

export function slugify(s: string): string {
  return unaccent(s)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Bỏ ký hiệu Markdown và cắt gọn cho đoạn trích, meta description. */
export function excerpt(markdown: string, max = 160): string {
  const plain = markdown
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[*_`>#~]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (plain.length <= max) return plain;
  const cut = plain.slice(0, max - 1);
  return cut.slice(0, Math.max(cut.lastIndexOf(" "), 1)) + "…";
}

/** Tên gốc của phim, chỉ trả về khi khác tên đang hiển thị (không tính hoa thường, khoảng trắng thừa). */
export function otherTitle(title: string, original: string | null): string | null {
  const key = (s: string) => s.normalize("NFC").replace(/\s+/g, " ").trim().toLowerCase();
  return original && key(original) && key(original) !== key(title) ? original : null;
}

/** Chỉ cho phép quay về đường dẫn nội bộ sau đăng nhập. */
export function safeNext(next: string | null | undefined): string {
  if (!next || !next.startsWith("/") || /^\/[/\\]/.test(next) || /[\u0000-\u001f\\]/.test(next)) return "/";
  return next;
}

/** Lấy id video YouTube; chuỗi lạ trả về null. */
export function youtubeId(url: string | null): string | null {
  const m = url?.match(/^https:\/\/(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]{11})/);
  return m ? m[1] : null;
}

export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" }).format(new Date(iso));
}

export const isUuid = (s: string) => /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(s);
