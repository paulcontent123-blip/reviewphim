import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ReviewCard } from "@/components/ReviewCard";
import { WriteReviewLink } from "@/components/WriteReviewLink";
import { getFilm, listReviews } from "@/lib/data";

export const revalidate = 300;
export const generateStaticParams = () => [];

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const film = await getFilm((await params).slug);
  if (!film) return { title: "Không tìm thấy phim" };
  return {
    title: `Review phim ${film.title}`,
    description: `Tổng hợp review phim ${film.title} từ người xem.`,
    alternates: { canonical: `/phim/${film.slug}/review` },
  };
}

export default async function FilmReviewsPage({ params }: Props) {
  const film = await getFilm((await params).slug);
  if (!film) notFound();
  const reviews = await listReviews({ filmId: film.id, limit: 50 });
  return (
    <div className="wrap">
      <Link href={`/phim/${film.slug}`} className="inline-flex min-h-[44px] items-center text-sm text-blue underline">
        ← {film.title}
      </Link>
      <h1 className="mb-4 font-display text-2xl font-bold">Review phim {film.title}</h1>
      <WriteReviewLink filmSlug={film.slug} className="btn-gold mb-6" />
      {reviews.length ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {reviews.map((r) => (
            <ReviewCard key={r.id} review={r} showFilm={false} />
          ))}
        </div>
      ) : (
        <p className="card p-6 text-sm text-fg2">Chưa có review nào.</p>
      )}
    </div>
  );
}
