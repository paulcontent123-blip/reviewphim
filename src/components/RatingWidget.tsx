"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import useSWR from "swr";
import { rateFilm } from "@/app/actions";
import { browserClient } from "@/lib/supabase/browser";
import { useAuth } from "@/store/auth";

export function RatingWidget({ filmId, filmSlug }: { filmId: string; filmSlug: string }) {
  const user = useAuth((s) => s.user);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string>();
  const { data: mine, mutate } = useSWR(user ? ["my-score", filmId, user.id] : null, async ([, film, uid]) => {
    const { data } = await browserClient()!.from("reviews").select("score").eq("film_id", film).eq("author_id", uid).maybeSingle();
    return (data?.score as number | undefined) ?? null;
  });

  const rate = (n: number) =>
    start(async () => {
      const res = await rateFilm(filmId, filmSlug, n);
      setError(res.error);
      if (res.ok) await mutate(n, { revalidate: false });
    });

  return (
    <section className="card p-4">
      <h2 className="sec-title mb-2">Chấm điểm phim này</h2>
      {user ? (
        <div className="grid grid-cols-5 gap-1.5" role="group" aria-label="Chọn điểm">
          {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
            <button
              key={n}
              type="button"
              disabled={pending}
              aria-pressed={mine === n}
              onClick={() => rate(n)}
              className={`h-11 rounded-md border text-sm font-bold ${mine === n ? "border-goldtext bg-goldtext text-white" : "border-line bg-bg3"}`}
            >
              {n}
            </button>
          ))}
        </div>
      ) : (
        <p className="text-sm text-fg2">
          <Link href={`/dang-nhap?next=/phim/${filmSlug}`} className="font-semibold text-blue underline">
            Đăng nhập
          </Link>{" "}
          để chấm điểm.
        </p>
      )}
      {error && (
        <p role="alert" className="mt-2 text-sm text-crimson">
          {error}
        </p>
      )}
      <Link href={`/phim/${filmSlug}/viet-review`} className="btn-ghost mt-3 w-full" prefetch={false}>
        Viết review
      </Link>
    </section>
  );
}
