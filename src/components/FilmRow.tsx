import type { Film } from "@/lib/types";
import { FilmCard } from "./FilmCard";

export function FilmRow({ title, films }: { title: string; films: Film[] }) {
  if (!films.length) return null;
  return (
    <section className="mb-8">
      <h2 className="sec-title mb-3">{title}</h2>
      <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
        {films.map((f) => (
          <FilmCard key={f.id} film={f} />
        ))}
      </div>
    </section>
  );
}

export function FilmGrid({ films, empty }: { films: Film[]; empty: string }) {
  if (!films.length) return <p className="card p-6 text-sm text-fg2">{empty}</p>;
  return (
    <div className="grid grid-cols-[repeat(auto-fill,140px)] justify-center gap-x-3 gap-y-6 sm:justify-start">
      {films.map((f) => (
        <FilmCard key={f.id} film={f} />
      ))}
    </div>
  );
}
