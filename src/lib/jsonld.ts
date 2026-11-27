import { siteUrl } from "@/lib/env";
import { excerpt } from "@/lib/text";
import type { FilmDetail, Review } from "@/lib/types";

const person = (name: string) => ({ "@type": "Person", name });

export function movieJsonLd(film: FilmDetail, reviews: Review[]) {
  return {
    "@context": "https://schema.org",
    "@type": (film.total_episodes ?? 1) > 1 ? "TVSeries" : "Movie",
    name: film.title,
    alternateName: film.original_title ?? undefined,
    url: `${siteUrl}/phim/${film.slug}`,
    image: film.poster_url ?? undefined,
    description: film.synopsis ?? undefined,
    dateCreated: film.year ? String(film.year) : undefined,
    genre: film.genres ?? undefined,
    director: film.director ? film.director.split(", ").map(person) : undefined,
    actor: film.cast.length ? film.cast.map((a) => person(a.name)) : undefined,
    // Google từ chối AggregateRating không có lượt đánh giá.
    aggregateRating:
      film.vote_count > 0 && film.site_score !== null
        ? { "@type": "AggregateRating", ratingValue: film.site_score, bestRating: 10, worstRating: 1, ratingCount: film.vote_count }
        : undefined,
    review: reviews.length ? reviews.map((r) => reviewNode(r)) : undefined,
  };
}

function reviewNode(r: Review) {
  return {
    "@type": "Review",
    name: r.title,
    url: `${siteUrl}/review/${r.slug}`,
    author: person(r.author_name),
    datePublished: r.published_at,
    reviewBody: r.spoiler || r.locked ? undefined : excerpt(r.content, 500),
    isAccessibleForFree: r.locked ? false : undefined,
    reviewRating: { "@type": "Rating", ratingValue: r.score, bestRating: 10, worstRating: 1 },
  };
}

export function reviewJsonLd(r: Review) {
  return {
    "@context": "https://schema.org",
    ...reviewNode(r),
    itemReviewed: { "@type": "Movie", name: r.film_title, url: `${siteUrl}/phim/${r.film_slug}`, image: r.film_poster_url ?? undefined },
    publisher: { "@type": "Organization", name: "ReviewPhim.vn", url: siteUrl },
  };
}

/** Thoát "<" để nội dung người dùng không đóng được thẻ script. */
export const serializeJsonLd = (data: unknown) => JSON.stringify(data).replace(/</g, "\\u003c");
