import Link from "next/link";
import { notFound } from "next/navigation";
import { DeleteLinkForm } from "@/components/admin/DeleteLinkForm";
import { LinkForm } from "@/components/admin/LinkForm";
import { adminFilm, requireAdmin } from "@/lib/data/admin";
import { PLATFORMS, sortOptions } from "@/lib/platforms";

export default async function AdminFilmPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  await requireAdmin(`/admin/phim/${slug}`);
  const film = await adminFilm(slug);
  if (!film) notFound();
  const options = sortOptions(film.watch_options);

  return (
    <div className="max-w-3xl">
      <h1 className="font-display text-2xl font-bold">{film.title}</h1>
      <Link href={`/phim/${film.slug}`} className="more mb-4 w-fit" prefetch={false}>
        Xem trang phim
      </Link>

      <h2 className="sec-title mb-3">Link đang có ({options.length})</h2>
      {options.length === 0 && <p className="card mb-6 p-4 text-sm text-fg2">Phim chưa có link xem.</p>}
      <ul className="mb-8 space-y-4">
        {options.map((o) => (
          <li key={o.id} className="card p-4" aria-label={PLATFORMS[o.platform].name}>
            <p className="mb-3 break-all text-sm">
              <strong>{PLATFORMS[o.platform].name}</strong> · {o.url}
            </p>
            <LinkForm filmId={film.id} filmSlug={film.slug} option={o} />
            <DeleteLinkForm optionId={o.id} filmSlug={film.slug} />
          </li>
        ))}
      </ul>

      <section className="card p-4" aria-label="Thêm link">
        <h2 className="sec-title mb-3">Thêm link</h2>
        {/* Đổi key sau khi thêm để form trở về trống. */}
        <LinkForm key={options.length} filmId={film.id} filmSlug={film.slug} />
      </section>
    </div>
  );
}
