import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/JsonLd";
import { LikeButton } from "@/components/LikeButton";
import { Markdown } from "@/components/Markdown";
import { ReviewBody } from "@/components/ReviewBody";
import { Spoiler } from "@/components/Spoiler";
import { WatchOptions } from "@/components/WatchOptions";
import { getFilm, getReview } from "@/lib/data";
import { reviewJsonLd } from "@/lib/jsonld";
import { excerpt, formatDate } from "@/lib/text";

export const revalidate = 300;
export const generateStaticParams = () => [];

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const r = await getReview((await params).slug);
  if (!r) return { title: "Không tìm thấy review" };
  return {
    title: r.title,
    description: r.spoiler ? `Review phim ${r.film_title} của ${r.author_name}.` : excerpt(r.content),
    authors: [{ name: r.author_name }],
    alternates: { canonical: `/review/${r.slug}` },
    openGraph: {
      type: "article",
      title: r.title,
      url: `/review/${r.slug}`,
      images: r.film_poster_url ? [r.film_poster_url] : undefined,
    },
  };
}

export default async function ReviewPage({ params }: Props) {
  const review = await getReview((await params).slug);
  if (!review) notFound();
  const film = await getFilm(review.film_slug);
  const body = <Markdown text={review.content} />;

  return (
    <div className="wrap grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <JsonLd data={reviewJsonLd(review)} />
      <article className="min-w-0">
        <Link href={`/phim/${review.film_slug}`} className="inline-flex min-h-[44px] items-center text-sm font-semibold text-goldtext">
          {review.film_title} {review.film_year && `(${review.film_year})`}
        </Link>
        <h1 className="font-display text-3xl font-bold">{review.title}</h1>
        <p className="mb-6 mt-2 text-sm text-fg3">
          {review.author_name} · <time dateTime={review.published_at}>{formatDate(review.published_at)}</time> ·{" "}
          <strong className="text-fg">★ {review.score}/10</strong>
        </p>
        {review.locked ? (
          <ReviewBody reviewId={review.id} teaser={review.content} spoiler={review.spoiler} />
        ) : review.spoiler ? (
          <Spoiler>{body}</Spoiler>
        ) : (
          body
        )}
        {review.tags && review.tags.length > 0 && <p className="mt-6 text-sm text-fg3">{review.tags.map((t) => `#${t}`).join(" ")}</p>}
        <div className="mt-6">
          <LikeButton reviewId={review.id} slug={review.slug} likes={review.likes} />
        </div>
      </article>
      {film && (
        <div>
          <WatchOptions options={film.watch_options} />
        </div>
      )}
    </div>
  );
}
