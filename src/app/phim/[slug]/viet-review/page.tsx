import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { ReviewForm, type ReviewDraft } from "@/components/ReviewForm";
import { canPostContent, CONTENT_OFF_MESSAGE, HIDDEN_NOTICE } from "@/lib/content";
import { getFilm, usingSample } from "@/lib/data";
import { currentUser, sessionClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Viết review", robots: { index: false } };

export default async function WriteReviewPage({ params }: { params: { slug: string } }) {
  const film = await getFilm(params.slug);
  if (!film) notFound();

  let draft: ReviewDraft | null = null;
  let hidden = false;
  let askName = false;
  if (!usingSample()) {
    // Kiểm tra trước khi bắt đăng nhập: công tắc tắt thì đăng nhập cũng không viết được.
    if (!(await canPostContent(sessionClient()))) {
      return (
        <div className="wrap max-w-3xl">
          <h1 className="mb-4 font-display text-2xl font-bold">Viết review: {film.title}</h1>
          <p className="card p-6 text-sm text-fg2">{CONTENT_OFF_MESSAGE}</p>
        </div>
      );
    }
    const user = await currentUser();
    if (!user) redirect(`/dang-nhap?next=${encodeURIComponent(`/phim/${film.slug}/viet-review`)}`);
    const { data } = await sessionClient()
      .from("reviews")
      .select("score,title,content,spoiler,tags,status")
      .eq("film_id", film.id)
      .eq("author_id", user.id)
      .maybeSingle();
    draft = data;
    hidden = data?.status === "hidden";
    const { data: profile } = await sessionClient().from("profiles").select("display_name").eq("id", user.id).maybeSingle();
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
