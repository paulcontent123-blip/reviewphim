import type { Metadata } from "next";
import { FilmGrid } from "@/components/FilmRow";
import { listFilms } from "@/lib/data";

export const metadata: Metadata = { title: "Tìm phim", robots: { index: false } };

export default async function SearchPage({ searchParams }: { searchParams: { q?: string | string[] } }) {
  const raw = Array.isArray(searchParams.q) ? searchParams.q[0] : searchParams.q;
  const q = (raw ?? "").trim().slice(0, 80);
  const films = q ? await listFilms({ q, limit: 60 }) : [];
  return (
    <div className="wrap">
      <h1 className="mb-5 font-display text-2xl font-bold">{q ? `Kết quả cho “${q}”` : "Tìm phim"}</h1>
      <FilmGrid films={films} empty={q ? "Không tìm thấy phim nào." : "Nhập tên phim vào ô tìm kiếm."} />
    </div>
  );
}
