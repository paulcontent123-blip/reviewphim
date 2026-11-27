import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ActorChip } from "@/components/ActorChip";
import { EpisodeGrid } from "@/components/EpisodeGrid";
import { JsonLd } from "@/components/JsonLd";
import { Poster } from "@/components/Poster";
import { RatingWidget } from "@/components/RatingWidget";
import { ReviewCard } from "@/components/ReviewCard";
import { ScoreSummary } from "@/components/ScoreSummary";
import { WatchOptions } from "@/components/WatchOptions";
import { getFilm, listReviews } from "@/lib/data";
import { genreByName } from "@/lib/genres";
import { movieJsonLd } from "@/lib/jsonld";
import { excerpt, otherTitle, youtubeId } from "@/lib/text";

export const revalidate = 300;
export const generateStaticParams = () => [];

type Props = { params: { slug: string } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const film = await getFilm(params.slug);
  if (!film) return { title: "Không tìm thấy phim" };
  const title = `${film.title} - Review & Đánh giá`;
  return {
    title,
    description: film.synopsis ? excerpt(film.synopsis) : `Điểm đánh giá, review và nơi xem phim ${film.title}.`,
    alternates: { canonical: `/phim/${film.slug}` },
    openGraph: { title, url: `/phim/${film.slug}`, images: film.poster_url ? [film.poster_url] : undefined },
  };
}

export default async function FilmPage({ params }: Props) {
  const film = await getFilm(params.slug);
  if (!film) notFound();
  const reviews = await listReviews({ filmId: film.id, limit: 4 });
  const trailer = youtubeId(film.trailer_url);
  const episodes = film.total_episodes ?? 1;
  const original = otherTitle(film.title, film.original_title);

  return (
    <div className="wrap">
      <JsonLd data={movieJsonLd(film, reviews)} />
      <header className="relative mb-6 flex gap-4 overflow-hidden rounded-2xl bg-[#14131a] p-4 text-white sm:gap-6 sm:p-6">
        {/* Ảnh nền ẩn và tải trễ trên điện thoại, nên điện thoại không tải ảnh. */}
        {film.backdrop_url && (
          <>
            <Image src={film.backdrop_url} alt="" fill loading="lazy" sizes="100vw" className="hidden object-cover opacity-40 sm:block" />
            <div className="absolute inset-0 hidden bg-gradient-to-r from-black/80 via-black/60 to-black/20 sm:block" />
          </>
        )}
        <div className="relative aspect-[2/3] h-fit w-28 shrink-0 overflow-hidden rounded-lg sm:w-44">
          <Poster src={film.poster_url} title={film.title} priority />
        </div>
        <div className="relative min-w-0">
          <h1 className="font-display text-2xl font-bold sm:text-4xl">{film.title}</h1>
          {original && <p className="mt-1 text-sm italic text-white/80">{original}</p>}
          <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
            {film.site_score !== null ? (
              <span className="text-lg font-bold text-amber-300">
                ★ {film.site_score}/10 <span className="text-sm font-normal text-white/80">({film.vote_count} đánh giá)</span>
              </span>
            ) : (
              <span className="text-white/80">Chưa có đánh giá</span>
            )}
            {film.imdb_score !== null && <span className="rounded bg-amber-400 px-1.5 text-xs font-bold text-black">IMDb {film.imdb_score}</span>}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {film.genres?.map((name) => {
              const g = genreByName(name);
              return (
                g && (
                  <Link key={name} href={`/the-loai/${g.slug}`} className="rounded-full border border-white/30 px-3 py-2 text-xs hover:bg-white/10" prefetch={false}>
                    {name}
                  </Link>
                )
              );
            })}
          </div>
          {(film.watch_options.length > 0 || trailer) && (
            <div className="mt-4 flex flex-wrap gap-2">
              {film.watch_options.length > 0 && (
                <a href="#xem-o-dau" className="btn bg-amber-400 text-black">
                  Xem ở đâu
                </a>
              )}
              {trailer && (
                <a href="#trailer" className="btn border border-white/40 text-white">
                  Trailer
                </a>
              )}
            </div>
          )}
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="order-2 min-w-0 space-y-6 lg:order-1">
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Fact label="Đạo diễn" value={film.director} />
            <Fact label="Năm" value={film.year && <Link href={`/nam/${film.year}`} className="underline">{film.year}</Link>} />
            <Fact label="Quốc gia" value={film.country} />
            <Fact label="Số tập" value={episodes > 1 ? episodes : null} />
          </dl>
          {film.synopsis && (
            <section>
              <h2 className="sec-title mb-2">Nội dung</h2>
              <p className="leading-relaxed text-fg2">{film.synopsis}</p>
            </section>
          )}
          {film.cast.length > 0 && (
            <section>
              <h2 className="sec-title mb-3">Diễn viên</h2>
              <ul className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
                {film.cast.map((a, i) => (
                  <ActorChip key={i} actor={a} />
                ))}
              </ul>
            </section>
          )}
          {trailer && (
            <section id="trailer" className="scroll-mt-32">
              <h2 className="sec-title mb-3">Trailer</h2>
              <iframe
                className="aspect-video w-full rounded-xl"
                src={`https://www.youtube-nocookie.com/embed/${trailer}`}
                title={`Trailer ${film.title}`}
                loading="lazy"
                allow="fullscreen; picture-in-picture"
                referrerPolicy="strict-origin-when-cross-origin"
              />
            </section>
          )}
          {episodes > 1 && <EpisodeGrid filmId={film.id} total={episodes} />}
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="sec-title">Review</h2>
              {reviews.length > 0 && (
                <Link href={`/phim/${film.slug}/review`} className="more">
                  Xem tất cả
                </Link>
              )}
            </div>
            {film.site_score !== null && film.vote_count > 0 && (
              <ScoreSummary filmSlug={film.slug} score={film.site_score} count={film.vote_count} />
            )}
            {reviews.length ? (
              <div className="grid gap-4 sm:grid-cols-2">
                {reviews.map((r) => (
                  <ReviewCard key={r.id} review={r} showFilm={false} />
                ))}
              </div>
            ) : (
              <p className="card p-6 text-sm text-fg2">Chưa có review. Hãy là người đầu tiên.</p>
            )}
          </section>
        </div>
        <div className="order-1 space-y-4 lg:order-2">
          <WatchOptions options={film.watch_options} />
          <RatingWidget filmId={film.id} filmSlug={film.slug} />
        </div>
      </div>
    </div>
  );
}

function Fact({ label, value }: { label: string; value: React.ReactNode }) {
  if (!value) return null;
  return (
    <div className="rounded-lg bg-bg3 p-3">
      <dt className="text-xs text-fg3">{label}</dt>
      <dd className="text-sm font-semibold">{value}</dd>
    </div>
  );
}
