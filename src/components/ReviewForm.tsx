"use client";

import { startTransition, useActionState, useState, type FormEvent } from "react";
import { submitReview } from "@/app/actions";
import { HIDDEN_SAVED_MESSAGE } from "@/lib/content";
import { NAME_MAX, NAME_MIN } from "@/lib/display-name";
import { Markdown } from "./Markdown";

export interface ReviewDraft {
  score: number | null;
  title: string | null;
  content: string | null;
  spoiler: boolean;
  tags: string[] | null;
}

function Submit({ hidden, pending }: { hidden?: boolean; pending: boolean }) {
  return (
    <button type="submit" className="btn-gold" disabled={pending}>
      {hidden ? (pending ? "Đang lưu..." : "Lưu thay đổi") : pending ? "Đang đăng..." : "Đăng review"}
    </button>
  );
}

type Props = { filmId: string; filmSlug: string; draft: ReviewDraft | null; hidden?: boolean; askName?: boolean };

export function ReviewForm({ filmId, filmSlug, draft, hidden, askName }: Props) {
  const [state, action, pending] = useActionState(submitReview, {});
  const [content, setContent] = useState(draft?.content ?? "");
  const [preview, setPreview] = useState(false);

  // React 19 tự xóa form sau khi chạy action, kể cả khi lỗi. Gửi qua onSubmit để giữ dữ liệu đã nhập;
  // vẫn đặt action để form gửi được khi trang chưa tải xong script.
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    startTransition(() => action(data));
  }

  return (
    <form action={action} onSubmit={submit} className="space-y-4">
      <input type="hidden" name="film_id" value={filmId} />
      <input type="hidden" name="film_slug" value={filmSlug} />
      {askName && (
        <div>
          <label htmlFor="display_name" className="block text-sm font-semibold">
            Tên hiển thị
          </label>
          <input
            id="display_name"
            name="display_name"
            required
            minLength={NAME_MIN}
            maxLength={NAME_MAX}
            autoComplete="nickname"
            aria-describedby="display_name_hint"
            className="field mt-1"
          />
          <p id="display_name_hint" className="mt-1 text-xs text-fg3">
            Hiện cùng bài review của bạn. Chỉ đặt được một lần.
          </p>
        </div>
      )}
      <label className="block text-sm font-semibold">
        Điểm (1–10)
        <select name="score" required defaultValue={draft?.score ? Math.round(draft.score) : ""} className="field mt-1">
          <option value="" disabled>
            Chọn điểm
          </option>
          {Array.from({ length: 10 }, (_, i) => 10 - i).map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm font-semibold">
        Tiêu đề
        <input name="title" required minLength={5} maxLength={150} defaultValue={draft?.title ?? ""} className="field mt-1" />
      </label>
      <div>
        <label htmlFor="content" className="block text-sm font-semibold">
          Nội dung (Markdown, ít nhất 50 ký tự)
        </label>
        <textarea
          id="content"
          name="content"
          required
          minLength={50}
          maxLength={20000}
          rows={12}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="field mt-1"
        />
        <button type="button" className="btn-ghost mt-2" onClick={() => setPreview(!preview)} aria-expanded={preview}>
          {preview ? "Ẩn xem trước" : "Xem trước"}
        </button>
        {preview && (
          <div className="card mt-2 p-4">
            <Markdown text={content || "*Chưa có nội dung*"} />
          </div>
        )}
      </div>
      <label className="block text-sm font-semibold">
        Tag (cách nhau bằng dấu phẩy, tối đa 5)
        <input name="tags" maxLength={170} defaultValue={draft?.tags?.join(", ") ?? ""} className="field mt-1" />
      </label>
      <label className="flex min-h-[44px] items-center gap-2 text-sm">
        <input type="checkbox" name="spoiler" defaultChecked={draft?.spoiler} className="h-5 w-5" />
        Bài có tiết lộ nội dung phim
      </label>
      {state.error && (
        <p role="alert" className="text-sm text-crimson">
          {state.error}
        </p>
      )}
      {state.hidden && (
        <p role="status" className="text-sm text-[#1f6e36]">
          {HIDDEN_SAVED_MESSAGE}
        </p>
      )}
      <Submit hidden={hidden || state.hidden} pending={pending} />
    </form>
  );
}
