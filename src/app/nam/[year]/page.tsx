import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FilmGrid } from "@/components/FilmRow";
import { listFilms } from "@/lib/data";

export const revalidate = 3600;
export const generateStaticParams = () => [];

type Props = { params: Promise<{ year: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { year } = await params;
  return {
    title: `Phim năm ${year}`,
    description: `Danh sách phim năm ${year} kèm điểm đánh giá, review và nơi xem.`,
    alternates: { canonical: `/nam/${year}` },
  };
}

export default async function YearPage({ params }: Props) {
  const { year } = await params;
  if (!/^(19|20)\d{2}$/.test(year)) notFound();
  const films = await listFilms({ year: Number(year), limit: 60 });
  if (!films.length) notFound();
  return (
    <div className="wrap">
      <h1 className="mb-5 font-display text-2xl font-bold">Phim năm {year}</h1>
      <FilmGrid films={films} empty="" />
    </div>
  );
}
