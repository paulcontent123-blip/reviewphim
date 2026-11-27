"use client";

import dynamic from "next/dynamic";
import useSWR from "swr";
import { fullReview, PREMIUM_MESSAGE } from "@/lib/premium";
import { browserClient } from "@/lib/supabase/browser";
import { excerpt } from "@/lib/text";
import { useAuth } from "@/store/auth";
import { Spoiler } from "./Spoiler";

// Chỉ tải bộ hiển thị Markdown khi thật sự có bài đầy đủ, để trang review không nặng thêm với mọi người đọc.
const Markdown = dynamic(() => import("./Markdown").then((m) => m.Markdown));

/**
 * Bài bị khóa với khách. Trang tĩnh chỉ có đoạn trích; người đã đăng nhập hỏi lại database theo quyền của mình,
 * nên nội dung đầy đủ không nằm trong trang được cache.
 */
export function ReviewBody({ reviewId, teaser, spoiler }: { reviewId: string; teaser: string; spoiler: boolean }) {
  const user = useAuth((s) => s.user);
  const { data, isLoading } = useSWR(user ? ["review-body", reviewId, user.id] : null, ([, id]) =>
    fullReview(browserClient()!, id),
  );

  if (data) {
    const body = <Markdown text={data} />;
    return spoiler ? <Spoiler>{body}</Spoiler> : body;
  }
  // Chưa biết đăng nhập chưa, hoặc đang hỏi quyền: chưa hiện thông báo khóa để khỏi nháy.
  const checking = user === undefined || isLoading;
  return (
    <div className="space-y-4">
      {teaser && <p className="leading-relaxed text-fg2">{excerpt(teaser, 200).replace(/…$/, "")}…</p>}
      {!checking && (
        <p role="status" className="card p-4 text-sm font-semibold">
          {PREMIUM_MESSAGE}
        </p>
      )}
    </div>
  );
}
