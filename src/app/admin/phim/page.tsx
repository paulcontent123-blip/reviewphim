import Link from "next/link";
import { adminFilms, PAGE_SIZE, requireAdmin } from "@/lib/data/admin";

type Search = { q?: string; thieu?: string; trang?: string };

export default async function AdminFilmsPage({ searchParams }: { searchParams: Promise<Search> }) {
  await requireAdmin("/admin/phim");
  const search = await searchParams;
  const q = String(search.q ?? "").trim().slice(0, 80);
  const missing = search.thieu === "1";
  const page = Math.max(Math.trunc(Number(search.trang)) || 1, 1);
  const { films, total } = await adminFilms({ q, missing, page: page - 1 });

  const href = (to: number) => {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    if (missing) p.set("thieu", "1");
    if (to > 1) p.set("trang", String(to));
    return p.size ? `/admin/phim?${p}` : "/admin/phim";
  };

  return (
    <>
      <h1 className="mb-4 font-display text-2xl font-bold">Phim và link xem</h1>
      <form action="/admin/phim" className="mb-4 flex flex-wrap items-center gap-3">
        <input name="q" type="search" defaultValue={q} maxLength={80} placeholder="Tên phim..." aria-label="Tên phim" className="field sm:w-72" />
        <label className="flex min-h-[44px] items-center gap-2 text-sm">
          <input type="checkbox" name="thieu" value="1" defaultChecked={missing} className="h-5 w-5" />
          Chỉ phim chưa có link
        </label>
        <button type="submit" className="btn-gold">
          Tìm
        </button>
      </form>
      <p className="mb-3 text-sm text-fg3">{total} phim</p>
      {films.length === 0 && <p className="card p-6 text-sm text-fg2">Không có phim phù hợp.</p>}
      <ul className="space-y-2">
        {films.map((f) => (
          <li key={f.id}>
            <Link href={`/admin/phim/${f.slug}`} className="card flex min-h-[56px] items-center gap-3 px-4 py-2 hover:border-gold" prefetch={false}>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold">{f.title}</span>
                <span className="text-xs text-fg3">{f.year ?? "Chưa rõ năm"}</span>
              </span>
              <span className={`shrink-0 text-xs font-semibold ${f.watch_options.length ? "text-[#1f6e36]" : "text-crimson"}`}>
                {f.watch_options.length ? `${f.watch_options.length} link` : "Chưa có link"}
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <nav aria-label="Phân trang" className="mt-4 flex gap-2">
        {page > 1 && (
          <Link href={href(page - 1)} className="btn-ghost" prefetch={false}>
            Trang trước
          </Link>
        )}
        {page * PAGE_SIZE < total && (
          <Link href={href(page + 1)} className="btn-ghost" prefetch={false}>
            Trang sau
          </Link>
        )}
      </nav>
    </>
  );
}
