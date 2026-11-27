/** Kiểm tra dữ liệu trang quản trị. Quyền và ràng buộc thật do database ép (migration 0007). */
import { PLATFORMS, TYPES } from "@/lib/platforms";
import type { Platform, WatchOption } from "@/lib/types";

export const QUALITIES = ["4K", "FHD", "HD"] as const;
export const URL_MAX = 2000;
export const LABEL_MAX = 60;

export type LinkValues = Pick<WatchOption, "platform" | "url" | "type" | "quality" | "label">;

const BAD_URL = "Địa chỉ phải là link https đầy đủ, ví dụ https://vieon.vn/...";

/** Trả địa chỉ đã chuẩn hóa, hoặc null nếu không phải link https dùng được. */
function httpsUrl(raw: string): string | null {
  if (!URL.canParse(raw)) return null;
  const url = new URL(raw);
  if (url.protocol !== "https:" || !url.hostname.includes(".") || url.username || url.password) return null;
  return url.href;
}

export function parseLink(form: FormData): { values: LinkValues } | { error: string } {
  const text = (key: string) => String(form.get(key) ?? "").trim();
  const platform = text("platform");
  if (!Object.hasOwn(PLATFORMS, platform)) return { error: "Hãy chọn nền tảng." };
  const url = httpsUrl(text("url"));
  if (!url) return { error: BAD_URL };
  if (url.length > URL_MAX) return { error: `Địa chỉ dài tối đa ${URL_MAX} ký tự.` };
  const type = text("type");
  if (type && !Object.hasOwn(TYPES, type)) return { error: "Hãy chọn hình thức trong danh sách." };
  const quality = text("quality");
  if (quality && !(QUALITIES as readonly string[]).includes(quality)) return { error: "Hãy chọn chất lượng trong danh sách." };
  const label = text("label");
  if ([...label].length > LABEL_MAX) return { error: `Ghi chú dài tối đa ${LABEL_MAX} ký tự.` };
  return {
    values: {
      platform: platform as Platform,
      url,
      type: (type || null) as LinkValues["type"],
      quality: (quality || null) as LinkValues["quality"],
      label: label || null,
    },
  };
}

export function adminError({ code, message }: { code?: string; message: string }): string {
  if (code === "42501" || message.includes("admin_only")) return "Bạn không có quyền quản trị.";
  if (message.includes("review_not_found")) return "Không tìm thấy bài.";
  return "Không thực hiện được, vui lòng thử lại.";
}
