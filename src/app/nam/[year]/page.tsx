import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FilmGrid } from "@/components/FilmRow";
import { listFilms } from "@/lib/data";

export const revalidate = 3600;
export const generateStaticParams = () => [];

type Props = { params: { year: string } };

export function generateMetadata({ params }: Props): Metadata {
  return {
    title: `Phim năm ${params.year}`,
    description: `Danh sách phim năm ${params.year} kèm điểm đánh giá, review và nơi xem.`,
    alternates: { canonical: `/nam/${params.year}` },
  };
}

export default async function YearPage({ params }: Props) {
  if (!/^(19|20)\d{2}$/.test(params.year)) notFound();
  const films = await listFilms({ year: Number(params.year), limit: 60 });
  if (!films.length) notFound();
  return (
    <div className="wrap">
      <h1 className="mb-5 font-display text-2xl font-bold">Phim năm {params.year}</h1>
      <FilmGrid films={films} empty="" />
    </div>
  );
}
