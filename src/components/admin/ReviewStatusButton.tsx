"use client";

import { useFormState, useFormStatus } from "react-dom";
import { setReviewStatus } from "@/app/admin/actions";

function Submit({ hidden }: { hidden: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={hidden ? "btn-gold" : "btn bg-crimson text-white"} disabled={pending}>
      {pending ? "Đang lưu..." : hidden ? "Hiện lại" : "Ẩn bài"}
    </button>
  );
}

export function ReviewStatusButton({ reviewId, hidden }: { reviewId: string; hidden: boolean }) {
  const [state, action] = useFormState(setReviewStatus, {});
  return (
    <form action={action} className="flex flex-wrap items-center gap-3">
      <input type="hidden" name="review_id" value={reviewId} />
      <input type="hidden" name="status" value={hidden ? "published" : "hidden"} />
      <Submit hidden={hidden} />
      {state.error && (
        <p role="alert" className="text-sm text-crimson">
          {state.error}
        </p>
      )}
    </form>
  );
}
