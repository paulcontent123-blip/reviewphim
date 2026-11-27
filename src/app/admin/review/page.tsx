import Link from "next/link";
import { ReviewStatusButton } from "@/components/admin/ReviewStatusButton";
import { Markdown } from "@/components/Markdown";
import { adminReviews, requireAdmin } from "@/lib/data/admin";
import { formatDate } from "@/lib/text";

type Search = { "trang-thai"?: string; trang?: string };

export default async function AdminReviewsPage({ searchParams }: { searchParams: Promise<Search> }) {
  await requireAdmin("/admin/review");
  const search = await searchParams;
  const hidden = search["trang-thai"] === "an";
  const page = Math.max(Math.trunc(Number(search.trang)) || 1, 1);
  const { reviews, hasNext } = await adminReviews(hidden ? "hidden" : "published", page - 1);

  const href = (toHidden: boolean, to = 1) => {
    const p = new URLSearchParams();
    if (toHidden) p.set("trang-thai", "an");
    if (to > 1) p.set("trang", String(to));
    return p.size ? `/admin/review?${p}` : "/admin/review";
  };

  return (
    <div className="max-w-3xl">
      <h1 className="mb-4 font-display text-2xl font-bold">Review</h1>
      <nav aria-label="Lọc trạng thái" className="mb-4 flex gap-2">
        <Link href={href(false)} className="chip" aria-current={hidden ? undefined : "page"} prefetch={false}>
          Đang hiện
        </Link>
        <Link href={href(true)} className="chip" aria-current={hidden ? "page" : undefined} prefetch={false}>
          Đang ẩn
        </Link>
      </nav>
      {reviews.length === 0 && <p className="card p-6 text-sm text-fg2">{hidden ? "Không có bài đang ẩn." : "Chưa có bài nào."}</p>}
      <ul className="space-y-4">
        {reviews.map((r) => (
          <li key={r.id}>
            <article className="card p-4" aria-label={r.title}>
              <h2 className="font-display text-lg font-bold">{r.title}</h2>
              <p className="mb-2 text-xs text-fg3">
                {r.film_title} · {r.author_name} · {formatDate(r.published_at)} · ★ {r.score}/10
                {r.spoiler && " · Có tiết lộ nội dung"}
              </p>
              <details className="mb-3">
                <summary className="flex min-h-[44px] cursor-pointer items-center text-sm font-semibold text-blue">Đọc nội dung</summary>
                <Markdown text={r.content} />
              </details>
              <div className="flex flex-wrap items-center gap-3">
                <ReviewStatusButton reviewId={r.id} hidden={hidden} />
                {!hidden && (
                  <Link href={`/review/${r.slug}`} className="more" prefetch={false}>
                    Xem trang bài
                  </Link>
                )}
              </div>
            </article>
          </li>
        ))}
      </ul>
      <nav aria-label="Phân trang" className="mt-4 flex gap-2">
        {page > 1 && (
          <Link href={href(hidden, page - 1)} className="btn-ghost" prefetch={false}>
            Trang trước
          </Link>
        )}
        {hasNext && (
          <Link href={href(hidden, page + 1)} className="btn-ghost" prefetch={false}>
            Trang sau
          </Link>
        )}
      </nav>
    </div>
  );
}
