/** Công tắc nội dung người dùng. Quyền thật do RLS ép; phần này chỉ để giao diện và server action báo đúng. */
export const CONTENT_OFF_MESSAGE = "Chấm điểm và viết review đang tạm tắt.";

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
