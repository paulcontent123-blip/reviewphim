import Link from "next/link";
import type { Film } from "@/lib/types";
import { Poster } from "./Poster";

const BADGE = {
  now_showing: { text: "Đang chiếu", color: "bg-crimson" },
  coming_soon: { text: "Sắp chiếu", color: "bg-blue" },
  streaming: { text: "Streaming", color: "bg-[#1f6e36]" },
} as const;

export function FilmCard({ film }: { film: Film }) {
  const badge = film.status && BADGE[film.status];
  return (
    <Link href={`/phim/${film.slug}`} className="group block w-[140px] shrink-0">
      <div className="relative aspect-[2/3] overflow-hidden rounded-lg border border-line bg-bg3">
        <Poster src={film.poster_url} title={film.title} />
        {badge && (
          <span className={`absolute left-1.5 top-1.5 rounded px-1.5 py-0.5 text-[11px] font-semibold text-white ${badge.color}`}>
            {badge.text}
          </span>
        )}
        {film.site_score !== null && (
          <span className="absolute bottom-1.5 right-1.5 rounded bg-black/80 px-1.5 py-0.5 text-xs font-bold text-amber-300">
            ★ {film.site_score}
          </span>
        )}
      </div>
      <h3 className="mt-1.5 line-clamp-2 text-sm font-semibold leading-snug group-hover:text-goldtext">{film.title}</h3>
      <p className="text-xs text-fg3">
        {[film.year, film.genres?.[0], (film.total_episodes ?? 1) > 1 && `${film.total_episodes} tập`].filter(Boolean).join(" · ")}
      </p>
    </Link>
  );
}
