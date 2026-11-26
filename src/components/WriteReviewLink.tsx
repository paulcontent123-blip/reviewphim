"use client";

import Link from "next/link";
import { useCanPost } from "./useCanPost";

/** Nút "Viết review", ẩn khi công tắc nội dung tắt. Hỏi ở trình duyệt để trang vẫn ISR được. */
export function WriteReviewLink({ filmSlug, className }: { filmSlug: string; className: string }) {
  const canPost = useCanPost();
  if (!canPost) return null;
  return (
    <Link href={`/phim/${filmSlug}/viet-review`} className={className} prefetch={false}>
      Viết review
    </Link>
  );
}
