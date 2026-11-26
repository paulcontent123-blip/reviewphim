import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FilmGrid } from "@/components/FilmRow";
import { listFilms } from "@/lib/data";
import { GENRES, genreBySlug } from "@/lib/genres";

export const revalidate = 3600;
export const dynamicParams = false;
export const generateStaticParams = () => GENRES.map((g) => ({ slug: g.slug }));

type Props = { params: { slug: string } };

export function generateMetadata({ params }: Props): Metadata {
  const g = genreBySlug(params.slug);
  if (!g) return {};
  return {
    title: `Phim ${g.name.toLowerCase()} hay`,
    description: `Danh sách phim ${g.name.toLowerCase()} kèm điểm đánh giá, review và nơi xem.`,
    alternates: { canonical: `/the-loai/${g.slug}` },
  };
}

export default async function GenrePage({ params }: Props) {
  const g = genreBySlug(params.slug);
  if (!g) notFound();
  return (
    <div className="wrap">
      <h1 className="mb-5 font-display text-2xl font-bold">Phim {g.name.toLowerCase()}</h1>
      <FilmGrid films={await listFilms({ genre: g.name, limit: 60 })} empty="Chưa có phim thuộc thể loại này." />
    </div>
  );
}
