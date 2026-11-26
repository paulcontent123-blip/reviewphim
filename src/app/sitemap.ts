import type { MetadataRoute } from "next";
import { listSitemap } from "@/lib/data";
import { siteUrl } from "@/lib/env";
import { GENRES } from "@/lib/genres";

export const revalidate = 3600;

// Priority theo tech spec mục 6: phim 0.9 > review 0.8 > trang tĩnh 0.5.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { films, reviews } = await listSitemap();
  const years = [...new Set(films.map((f) => f.year).filter((y): y is number => y !== null))];
  return [
    { url: siteUrl, priority: 0.5 },
    { url: `${siteUrl}/review`, priority: 0.5 },
    ...films.map((f) => ({ url: `${siteUrl}/phim/${f.slug}`, lastModified: f.updated_at, priority: 0.9 })),
    ...reviews.map((r) => ({ url: `${siteUrl}/review/${r.slug}`, lastModified: r.published_at, priority: 0.8 })),
    ...GENRES.map((g) => ({ url: `${siteUrl}/the-loai/${g.slug}`, priority: 0.5 })),
    ...years.map((y) => ({ url: `${siteUrl}/nam/${y}`, priority: 0.5 })),
  ];
}
