/** Tên hiển thị. Quy tắc thật do database ép (migration 0005); phần này để báo lỗi dễ hiểu. */
import { CONTENT_OFF_MESSAGE } from "@/lib/content";
import { unaccent } from "@/lib/text";

export const NAME_MIN = 2;
export const NAME_MAX = 30;

const LENGTH_MESSAGE = `Tên hiển thị dài từ ${NAME_MIN} đến ${NAME_MAX} ký tự.`;
const FORMAT_MESSAGE = "Tên chỉ gồm chữ cái, số và khoảng trắng.";

/** Đưa về dạng database chấp nhận: dấu tiếng Việt dựng sẵn, một khoảng trắng giữa các từ. */
export const normalizeName = (raw: string) => raw.normalize("NFC").replace(/\s+/g, " ").trim();

export function nameFormatError(name: string): string | null {
  const length = [...name].length;
  if (length < NAME_MIN || length > NAME_MAX) return LENGTH_MESSAGE;
  // Còn dấu rời sau khi chuẩn hóa nghĩa là chữ bị chồng dấu.
  if (/[̀-ͯ]/.test(name) || !/^[a-z0-9]+( [a-z0-9]+)*$/.test(unaccent(name))) return FORMAT_MESSAGE;
  return null;
}

/** Lỗi khi ghi profiles.display_name. */
export function nameSaveError({ code, message }: { code?: string; message: string }): string {
  if (code === "23505" && message.includes("profiles_display_name_key")) return "Tên này đã có người dùng.";
  if (message.includes("display_name_reserved")) return "Tên này không được dùng.";
  if (message.includes("display_name_locked")) return "Tài khoản đã có tên hiển thị, không đổi được.";
  if (message.includes("display_name_off")) return CONTENT_OFF_MESSAGE;
  if (message.includes("profiles_display_name_format")) return FORMAT_MESSAGE;
  return "Không lưu được tên, vui lòng thử lại.";
}
