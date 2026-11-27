import Image from "next/image";
import Link from "next/link";
import { genreByName } from "@/lib/genres";
import { otherTitle } from "@/lib/text";
import type { Film } from "@/lib/types";

export function HeroBanner({ film, hasLinks }: { film: Film; hasLinks: boolean }) {
  const genres = (film.genres ?? []).flatMap((name) => genreByName(name) ?? []).slice(0, 3);
  return (
    <section className="relative mb-8 overflow-hidden rounded-2xl bg-[#0a0a12] text-white">
      {film.backdrop_url && <Image src={film.backdrop_url} alt="" fill priority sizes="100vw" className="object-cover opacity-50" />}
      <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/60 to-transparent" />
      <div className="relative max-w-xl px-5 py-10 sm:px-8 sm:py-16">
        <p className="text-xs font-semibold uppercase tracking-wider text-amber-300">Phim nổi bật</p>
        <h1 className="mt-2 font-display text-3xl font-bold sm:text-4xl">{film.title}</h1>
        <p className="mt-1 text-sm italic text-white/80">
          {[otherTitle(film.title, film.original_title), film.year, film.country].filter(Boolean).join(" · ")}
        </p>
        {genres.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {genres.map((g) => (
              <Link
                key={g.slug}
                href={`/the-loai/${g.slug}`}
                className="inline-flex min-h-[44px] items-center rounded-full border border-white/30 px-3 text-xs hover:bg-white/10"
                prefetch={false}
              >
                {g.name}
              </Link>
            ))}
          </div>
        )}
        {film.site_score !== null && (
          <p className="mt-3 text-lg font-bold text-amber-300">
            ★ {film.site_score}/10 <span className="text-sm font-normal text-white/80">({film.vote_count} đánh giá)</span>
          </p>
        )}
        {film.synopsis && <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-white/90">{film.synopsis}</p>}
        <div className="mt-5 flex flex-wrap gap-2">
          {hasLinks && (
            <Link href={`/phim/${film.slug}#xem-o-dau`} className="btn bg-amber-400 text-black">
              Xem ở đâu
            </Link>
          )}
          <Link href={`/phim/${film.slug}`} className={`btn ${hasLinks ? "border border-white/40 text-white" : "bg-amber-400 text-black"}`}>
            Chi tiết
          </Link>
        </div>
      </div>
    </section>
  );
}
