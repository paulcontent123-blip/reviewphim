import Link from "next/link";
import { excerpt, formatDate } from "@/lib/text";
import type { Review } from "@/lib/types";

export function ReviewCard({ review, showFilm = true }: { review: Review; showFilm?: boolean }) {
  return (
    <article className="card flex flex-col p-4">
      {showFilm && (
        <Link href={`/phim/${review.film_slug}`} className="text-xs font-semibold uppercase tracking-wide text-goldtext">
          {review.film_title}
        </Link>
      )}
      <h3 className="mt-1 font-display text-lg font-bold leading-snug">
        <Link href={`/review/${review.slug}`} className="hover:underline">
          {review.title}
        </Link>
      </h3>
      <p className="mt-2 line-clamp-3 flex-1 text-sm leading-relaxed text-fg2">
        {review.spoiler ? "Bài viết có tiết lộ nội dung phim." : excerpt(review.content)}
      </p>
      <p className="mt-3 flex flex-wrap justify-between gap-2 text-xs text-fg3">
        <span>
          {review.author_name} · {formatDate(review.published_at)} · {review.likes} hữu ích
          {review.locked && <strong className="text-goldtext"> · Premium</strong>}
        </span>
        <span className="font-bold text-fg">★ {review.score}/10</span>
      </p>
    </article>
  );
}
