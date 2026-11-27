// Theo Data Models trong tech spec mục 3.

export type FilmStatus = "now_showing" | "coming_soon" | "streaming";
export type Platform = "vieon" | "fptplay" | "netflix" | "galaxyplay" | "cgv" | "other";

export interface Actor {
  name: string;
  role: string | null;
  avatar_url: string | null;
}

export interface WatchOption {
  id: string;
  film_id: string;
  platform: Platform;
  url: string;
  type: "subscription" | "rent" | "buy" | "free" | null;
  quality: "4K" | "FHD" | "HD" | null;
  label: string | null;
}

export interface Film {
  id: string;
  slug: string;
  title: string;
  original_title: string | null;
  poster_url: string | null;
  backdrop_url: string | null;
  genres: string[] | null;
  year: number | null;
  country: string | null;
  imdb_score: number | null;
  site_score: number | null;
  vote_count: number;
  director: string | null;
  synopsis: string | null;
  trailer_url: string | null;
  status: FilmStatus | null;
  total_episodes: number | null;
  updated_at: string;
}

export interface FilmDetail extends Film {
  cast: Actor[];
  watch_options: WatchOption[];
}

/** Một dòng của view review_feed. */
export interface Review {
  id: string;
  slug: string;
  title: string;
  content: string;
  score: number;
  spoiler: boolean;
  tags: string[] | null;
  likes: number;
  published_at: string;
  film_id: string;
  film_slug: string;
  film_title: string;
  film_poster_url: string | null;
  film_genres: string[] | null;
  film_year: number | null;
  author_name: string;
  author_avatar_url: string | null;
  author_role: "viewer" | "reviewer" | "partner" | "admin";
  /** Khách chỉ được đọc đoạn trích; content lúc đó không phải toàn bài. */
  locked: boolean;
}

export interface FilmQuery {
  status?: FilmStatus;
  genre?: string;
  year?: number;
  q?: string;
  sort?: "new" | "score";
  limit?: number;
}

export interface ReviewQuery {
  filmId?: string;
  genre?: string;
  minScore?: number;
  limit?: number;
}
