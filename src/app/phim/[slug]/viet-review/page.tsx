import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { ReviewForm, type ReviewDraft } from "@/components/ReviewForm";
import { canPostContent, CONTENT_OFF_MESSAGE, HIDDEN_NOTICE } from "@/lib/content";
import { getFilm, usingSample } from "@/lib/data";
import { currentUser, sessionClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Viết review", robots: { index: false } };

export default async function WriteReviewPage({ params }: { params: Promise<{ slug: string }> }) {
  const film = await getFilm((await params).slug);
  if (!film) notFound();

  let draft: ReviewDraft | null = null;
  let hidden = false;
  let askName = false;
  if (!usingSample()) {
    const db = await sessionClient();
    // Kiểm tra trước khi bắt đăng nhập: công tắc tắt thì đăng nhập cũng không viết được.
    if (!(await canPostContent(db))) {
      return (
        <div className="wrap max-w-3xl">
          <h1 className="mb-4 font-display text-2xl font-bold">Viết review: {film.title}</h1>
          <p className="card p-6 text-sm text-fg2">{CONTENT_OFF_MESSAGE}</p>
        </div>
      );
    }
    const user = await currentUser();
    if (!user) redirect(`/dang-nhap?next=${encodeURIComponent(`/phim/${film.slug}/viet-review`)}`);
    // Cột content không đọc thẳng được (gói Premium); hàm này chỉ trả bài của người đang đăng nhập.
    const { data } = await db.rpc("my_review", { film: film.id }).maybeSingle();
    const mine = data as (ReviewDraft & { status: string }) | null;
    draft = mine;
    hidden = mine?.status === "hidden";
    const { data: profile } = await db.from("profiles").select("display_name").eq("id", user.id).maybeSingle();
    askName = profile?.display_name === null;
  }

  return (
    <div className="wrap max-w-3xl">
      <h1 className="mb-4 font-display text-2xl font-bold">
        {draft?.content ? "Sửa review" : "Viết review"}: {film.title}
      </h1>
      {hidden && (
        <p role="status" className="card mb-4 border-crimson p-4 text-sm text-fg2">
          {HIDDEN_NOTICE}
        </p>
      )}
      <ReviewForm filmId={film.id} filmSlug={film.slug} draft={draft} hidden={hidden} askName={askName} />
    </div>
  );
}
