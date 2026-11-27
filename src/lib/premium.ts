/** Bài đọc theo gói (migration 0006). Quyền thật do database quyết; phần này chỉ để trình duyệt hỏi lại. */
export const PREMIUM_MESSAGE = "Bài này dành cho tài khoản Premium.";

interface RpcResult {
  data: unknown;
  error: unknown;
}

type Db = { rpc: (fn: "can_read_review" | "review_body", args: { target: string }) => PromiseLike<RpcResult> };

/** Nội dung đầy đủ nếu người đang gọi được đọc, ngược lại null. */
export async function fullReview(db: Db, reviewId: string): Promise<string | null> {
  const allowed = await db.rpc("can_read_review", { target: reviewId });
  if (allowed.error || allowed.data !== true) return null;
  const body = await db.rpc("review_body", { target: reviewId });
  return !body.error && typeof body.data === "string" ? body.data : null;
}
