"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { deleteLink } from "@/app/admin/actions";

function Confirm() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn bg-crimson text-white" disabled={pending}>
      {pending ? "Đang xóa..." : "Xóa hẳn link này"}
    </button>
  );
}

/** Xóa hai bước: không khôi phục được nên cần xác nhận. */
export function DeleteLinkForm({ optionId, filmSlug }: { optionId: string; filmSlug: string }) {
  const [state, action] = useFormState(deleteLink, {});
  const [asking, setAsking] = useState(false);
  return (
    <form action={action} className="mt-3 flex flex-wrap items-center gap-3 border-t border-line pt-3">
      <input type="hidden" name="option_id" value={optionId} />
      <input type="hidden" name="film_slug" value={filmSlug} />
      {asking ? (
        <>
          <Confirm />
          <button type="button" className="btn-ghost" onClick={() => setAsking(false)}>
            Giữ lại
          </button>
        </>
      ) : (
        <button type="button" className="btn-ghost text-crimson" onClick={() => setAsking(true)}>
          Xóa
        </button>
      )}
      {state.error && (
        <p role="alert" className="text-sm text-crimson">
          {state.error}
        </p>
      )}
    </form>
  );
}
