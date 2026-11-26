import Link from "next/link";
import type { Film } from "@/lib/types";

const COLORS = ["text-crimson", "text-goldtext", "text-[#1f6e36]"];

export function RankingSidebar({ films }: { films: Film[] }) {
  if (!films.length) return null;
  return (
    <aside className="card h-fit p-4">
      <h2 className="sec-title mb-2">Top 10 đánh giá cao</h2>
      <ol>
        {films.slice(0, 10).map((f, i) => (
          <li key={f.id}>
            <Link href={`/phim/${f.slug}`} className="flex min-h-[48px] items-center gap-3 border-b border-line py-1.5 hover:bg-bg3">
              <span className={`w-6 text-center font-display text-lg font-bold ${COLORS[i] ?? "text-fg3"}`}>{i + 1}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">{f.title}</span>
                <span className="text-xs text-fg3">{f.vote_count} đánh giá</span>
              </span>
              <span className="text-sm font-bold">★ {f.site_score}</span>
            </Link>
          </li>
        ))}
      </ol>
    </aside>
  );
}
