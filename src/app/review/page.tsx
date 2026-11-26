import type { Metadata } from "next";
import Link from "next/link";
import { ReviewCard } from "@/components/ReviewCard";
import { listReviews } from "@/lib/data";
import { GENRES, genreBySlug } from "@/lib/genres";

export const metadata: Metadata = {
  title: "Review phim mới nhất",
  description: "Review phim tiếng Việt mới nhất, lọc theo thể loại và điểm.",
  alternates: { canonical: "/review" },
};

const SCORES = [0, 7, 8, 9];

function href(genre?: string, score?: number) {
  const p = new URLSearchParams();
  if (genre) p.set("the-loai", genre);
  if (score) p.set("diem", String(score));
  return p.size ? `/review?${p}` : "/review";
}

export default async function ReviewsPage({ searchParams }: { searchParams: { "the-loai"?: string; diem?: string } }) {
  const genre = genreBySlug(String(searchParams["the-loai"] ?? ""));
  const min = SCORES.find((s) => String(s) === searchParams.diem) ?? 0;
  const reviews = await listReviews({ genre: genre?.name, minScore: min || undefined, limit: 40 });

  return (
    <div className="wrap">
      <h1 className="mb-4 font-display text-2xl font-bold">Review phim</h1>
      <nav aria-label="Lọc thể loại" className="-mx-4 mb-3 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
        <Link href={href(undefined, min)} className="chip shrink-0" aria-current={genre ? undefined : "page"}>
          Tất cả
        </Link>
        {GENRES.map((g) => (
          <Link key={g.slug} href={href(g.slug, min)} className="chip shrink-0" aria-current={genre?.slug === g.slug ? "page" : undefined} prefetch={false}>
            {g.name}
          </Link>
        ))}
      </nav>
      <nav aria-label="Lọc điểm" className="mb-6 flex flex-wrap gap-2">
        {SCORES.map((s) => (
          <Link key={s} href={href(genre?.slug, s)} className="chip" aria-current={min === s ? "page" : undefined} prefetch={false}>
            {s ? `Từ ${s} điểm` : "Mọi điểm"}
          </Link>
        ))}
      </nav>
      {reviews.length ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {reviews.map((r) => (
            <ReviewCard key={r.id} review={r} />
          ))}
        </div>
      ) : (
        <p className="card p-6 text-sm text-fg2">Không có review phù hợp.</p>
      )}
    </div>
  );
}
