"use client";

import { useState, useTransition } from "react";
import useSWR from "swr";
import { toggleLike } from "@/app/actions";
import { CONTENT_OFF_MESSAGE } from "@/lib/content";
import { browserClient } from "@/lib/supabase/browser";
import { useAuth } from "@/store/auth";
import { useCanPost } from "./useCanPost";

export function LikeButton({ reviewId, slug, likes }: { reviewId: string; slug: string; likes: number }) {
  const user = useAuth((s) => s.user);
  const canPost = useCanPost();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string>();
  const { data, mutate } = useSWR(user ? ["like", reviewId, user.id] : null, async ([, id, uid]) => {
    const db = browserClient()!;
    const [mine, total] = await Promise.all([
      db.from("review_likes").select("review_id").eq("review_id", id).eq("user_id", uid).maybeSingle(),
      db.from("review_feed").select("likes").eq("id", id).maybeSingle(),
    ]);
    return { liked: Boolean(mine.data), likes: (total.data?.likes as number | undefined) ?? likes };
  });
  const liked = data?.liked ?? false;
  const count = data?.likes ?? likes;

  const toggle = () =>
    start(async () => {
      const res = await toggleLike(reviewId, slug, !liked);
      setError(res.error);
      if (res.ok) await mutate({ liked: !liked, likes: Math.max(0, count + (liked ? -1 : 1)) }, { revalidate: false });
    });

  return (
    <div>
      {/* Đã bấm thì luôn bỏ được, kể cả khi công tắc nội dung tắt. */}
      <button type="button" className="btn-ghost" disabled={pending || (!liked && !canPost)} aria-pressed={liked} onClick={toggle}>
        {liked ? "♥" : "♡"} {count} Hữu ích
      </button>
      {canPost === false && <p className="mt-2 text-sm text-fg2">{CONTENT_OFF_MESSAGE}</p>}
      {error && (
        <p role="alert" className="mt-2 text-sm text-crimson">
          {error}
        </p>
      )}
    </div>
  );
}
