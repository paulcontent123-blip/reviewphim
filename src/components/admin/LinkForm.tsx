"use client";

import { startTransition, useActionState, type FormEvent } from "react";
import { saveLink } from "@/app/admin/actions";
import { LABEL_MAX, QUALITIES, URL_MAX } from "@/lib/admin";
import { PLATFORMS, TYPES } from "@/lib/platforms";
import type { Platform, WatchOption } from "@/lib/types";

function Submit({ label, pending }: { label: string; pending: boolean }) {
  return (
    <button type="submit" className="btn-gold" disabled={pending}>
      {pending ? "Đang lưu..." : label}
    </button>
  );
}

export function LinkForm({ filmId, filmSlug, option }: { filmId: string; filmSlug: string; option?: WatchOption }) {
  const [state, action, pending] = useActionState(saveLink, {});

  // React 19 tự xóa form sau khi chạy action, kể cả khi lỗi. Gửi qua onSubmit để giữ dữ liệu đã nhập;
  // vẫn đặt action để form gửi được khi trang chưa tải xong script.
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    startTransition(() => action(data));
  }

  return (
    <form action={action} onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
      <input type="hidden" name="film_id" value={filmId} />
      <input type="hidden" name="film_slug" value={filmSlug} />
      {option && <input type="hidden" name="option_id" value={option.id} />}
      <label className="block text-sm font-semibold sm:col-span-2">
        Địa chỉ link (https)
        <input name="url" type="url" required maxLength={URL_MAX} defaultValue={option?.url} placeholder="https://" className="field mt-1" />
      </label>
      <label className="block text-sm font-semibold">
        Nền tảng
        <select name="platform" required defaultValue={option?.platform ?? ""} className="field mt-1">
          <option value="" disabled>
            Chọn nền tảng
          </option>
          {(Object.keys(PLATFORMS) as Platform[]).map((key) => (
            <option key={key} value={key}>
              {PLATFORMS[key].name}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm font-semibold">
        Hình thức
        <select name="type" defaultValue={option?.type ?? ""} className="field mt-1">
          <option value="">Không ghi</option>
          {Object.entries(TYPES).map(([key, name]) => (
            <option key={key} value={key}>
              {name}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm font-semibold">
        Chất lượng
        <select name="quality" defaultValue={option?.quality ?? ""} className="field mt-1">
          <option value="">Không ghi</option>
          {QUALITIES.map((q) => (
            <option key={q} value={q}>
              {q}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm font-semibold">
        Ghi chú
        <input name="label" maxLength={LABEL_MAX} defaultValue={option?.label ?? ""} placeholder="Ví dụ: Vietsub" className="field mt-1" />
      </label>
      <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
        <Submit label={option ? "Lưu thay đổi" : "Thêm link"} pending={pending} />
        {state.error && (
          <p role="alert" className="text-sm text-crimson">
            {state.error}
          </p>
        )}
        {state.ok && (
          <p role="status" className="text-sm text-[#1f6e36]">
            Đã lưu.
          </p>
        )}
      </div>
    </form>
  );
}
