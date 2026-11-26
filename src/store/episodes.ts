import { create } from "zustand";
import { persist } from "zustand/middleware";

interface EpisodeState {
  /** filmId → tập đã xem tới; lưu trên trình duyệt. */
  progress: Record<string, number>;
  setProgress: (filmId: string, episode: number) => void;
}

export const useEpisodes = create<EpisodeState>()(
  persist(
    (set) => ({
      progress: {},
      setProgress: (filmId, episode) => set((s) => ({ progress: { ...s.progress, [filmId]: episode } })),
    }),
    { name: "rp-episodes", skipHydration: true },
  ),
);
