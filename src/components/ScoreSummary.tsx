import { starFill } from "@/lib/text";
import { WriteReviewLink } from "./WriteReviewLink";

const STARS = "★★★★★";

/** Khối điểm cộng đồng. Sao chỉ minh họa cho điểm thang 10. */
export function ScoreSummary({ filmSlug, score, count }: { filmSlug: string; score: number; count: number }) {
  return (
    <div className="card mb-4 flex flex-wrap items-center gap-x-5 gap-y-3 p-4">
      <p className="font-display text-5xl font-bold text-goldtext">
        {score}
        <span className="text-base text-fg3">/10</span>
      </p>
      <div className="flex-1">
        <div role="img" aria-label={`${score} trên 10`} className="relative inline-block text-2xl leading-none">
          <span aria-hidden className="text-bg4">
            {STARS}
          </span>
          <span aria-hidden className="absolute inset-y-0 left-0 overflow-hidden whitespace-nowrap text-gold" style={{ width: `${starFill(score)}%` }}>
            {STARS}
          </span>
        </div>
        <p className="mt-1 text-xs text-fg3">{count} đánh giá</p>
      </div>
      <WriteReviewLink filmSlug={filmSlug} className="btn-gold" />
    </div>
  );
}
