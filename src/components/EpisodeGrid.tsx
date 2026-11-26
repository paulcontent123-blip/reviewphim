"use client";

import { useEffect } from "react";
import { useEpisodes } from "@/store/episodes";

/** Đánh dấu tập đã xem (lưu trên trình duyệt). Site không phát phim. */
export function EpisodeGrid({ filmId, total }: { filmId: string; total: number }) {
  const current = useEpisodes((s) => s.progress[filmId] ?? 0);
  const setProgress = useEpisodes((s) => s.setProgress);
  useEffect(() => {
    void useEpisodes.persist.rehydrate();
  }, []);

  const color = (ep: number) => {
    if (ep === current) return "border-crimson bg-crimson text-white";
    return ep < current ? "border-goldtext bg-goldtext text-white" : "border-line bg-bg3";
  };

  return (
    <section className="card p-4">
      <h2 className="sec-title">Tập đã xem</h2>
      <p className="mb-3 text-xs text-fg3">Bấm vào tập bạn vừa xem để ghi nhớ trên máy này. Bấm lại để lùi một tập.</p>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(44px,1fr))] gap-1.5">
        {Array.from({ length: total }, (_, i) => i + 1).map((ep) => (
          <button
            key={ep}
            type="button"
            aria-label={`Tập ${ep}`}
            aria-pressed={ep <= current}
            onClick={() => setProgress(filmId, ep === current ? ep - 1 : ep)}
            className={`h-11 rounded-md border text-sm font-semibold ${color(ep)}`}
          >
            {ep}
          </button>
        ))}
      </div>
    </section>
  );
}
