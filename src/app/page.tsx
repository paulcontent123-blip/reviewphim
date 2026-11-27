import Link from "next/link";
import { FilmRow } from "@/components/FilmRow";
import { HeroBanner } from "@/components/HeroBanner";
import { RankingSidebar } from "@/components/RankingSidebar";
import { ReviewCard } from "@/components/ReviewCard";
import { hasWatchOptions, listFilms, listReviews } from "@/lib/data";
import { GENRES } from "@/lib/genres";

export const revalidate = 300;

export default async function HomePage() {
  const [showing, soon, streaming, top, reviews] = await Promise.all([
    listFilms({ status: "now_showing", limit: 12 }),
    listFilms({ status: "coming_soon", limit: 12 }),
    listFilms({ status: "streaming", limit: 12 }),
    listFilms({ sort: "score", limit: 10 }),
    listReviews({ limit: 4 }),
  ]);
  const hero = showing.find((f) => f.backdrop_url) ?? showing[0] ?? streaming[0] ?? soon[0];
  const heroHasLinks = hero ? await hasWatchOptions(hero.id) : false;

  return (
    <div className="wrap">
      {hero ? <HeroBanner film={hero} hasLinks={heroHasLinks} /> : <p className="card mb-8 p-6 text-sm text-fg2">Chưa có phim. Hãy chạy đồng bộ TMDB.</p>}
      {/* Chưa phim nào có điểm thì không có Top 10, đừng chừa cột trống. */}
      <div className={`grid gap-8 ${top.length ? "lg:grid-cols-[minmax(0,1fr)_300px]" : ""}`}>
        <div className="min-w-0">
          <FilmRow title="Đang chiếu rạp" films={showing} />
          <FilmRow title="Sắp chiếu" films={soon} />
          <FilmRow title="Xem trực tuyến" films={streaming} />
          {reviews.length > 0 && (
            <section className="mb-8">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="sec-title">Review mới</h2>
                <Link href="/review" className="more">
                  Xem tất cả
                </Link>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {reviews.map((r) => (
                  <ReviewCard key={r.id} review={r} />
                ))}
              </div>
            </section>
          )}
          <section>
            <h2 className="sec-title mb-3">Thể loại</h2>
            <div className="flex flex-wrap gap-2">
              {GENRES.map((g) => (
                <Link key={g.slug} href={`/the-loai/${g.slug}`} className="chip" prefetch={false}>
                  {g.name}
                </Link>
              ))}
            </div>
          </section>
        </div>
        <RankingSidebar films={top} />
      </div>
    </div>
  );
}
