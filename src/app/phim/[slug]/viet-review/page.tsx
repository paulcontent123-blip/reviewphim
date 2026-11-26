import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { ReviewForm, type ReviewDraft } from "@/components/ReviewForm";
import { getFilm, usingSample } from "@/lib/data";
import { currentUser, sessionClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Viết review", robots: { index: false } };

export default async function WriteReviewPage({ params }: { params: { slug: string } }) {
  const film = await getFilm(params.slug);
  if (!film) notFound();

  let draft: ReviewDraft | null = null;
  if (!usingSample()) {
    const user = await currentUser();
    if (!user) redirect(`/dang-nhap?next=${encodeURIComponent(`/phim/${film.slug}/viet-review`)}`);
    const { data } = await sessionClient()
      .from("reviews")
      .select("score,title,content,spoiler,tags")
      .eq("film_id", film.id)
      .eq("author_id", user.id)
      .maybeSingle();
    draft = data;
  }

  return (
    <div className="wrap max-w-3xl">
      <h1 className="mb-4 font-display text-2xl font-bold">
        {draft?.content ? "Sửa review" : "Viết review"}: {film.title}
      </h1>
      <ReviewForm filmId={film.id} filmSlug={film.slug} draft={draft} />
    </div>
  );
}
