/** Công tắc nội dung người dùng. Quyền thật do RLS ép; phần này chỉ để giao diện và server action báo đúng. */
export const CONTENT_OFF_MESSAGE = "Chấm điểm và viết review đang tạm tắt.";
export const HIDDEN_NOTICE =
  "Đánh giá của bạn cho phim này đang bị ẩn, người khác không xem được. Bạn vẫn sửa được, nhưng sửa xong cũng không tự hiện lại.";
export const HIDDEN_SAVED_MESSAGE = "Đã lưu. Bài vẫn đang bị ẩn.";

interface RpcResult {
  data: unknown;
  error: unknown;
}

/** Chỉ coi là tắt khi database trả đúng false. Không đọc được cờ thì cứ cho thử, database vẫn chặn. */
export const isPostingOff = ({ data, error }: RpcResult) => !error && data === false;

/** Người đang gọi (theo phiên của client) có được thêm, sửa nội dung không. */
export async function canPostContent(db: { rpc: (fn: "can_post_content") => PromiseLike<RpcResult> }): Promise<boolean> {
  return !isPostingOff(await db.rpc("can_post_content"));
}
