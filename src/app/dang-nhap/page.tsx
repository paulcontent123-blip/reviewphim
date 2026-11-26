import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/LoginForm";
import { currentUser } from "@/lib/supabase/server";
import { safeNext } from "@/lib/text";

export const metadata: Metadata = { title: "Đăng nhập", robots: { index: false } };

export default async function LoginPage({ searchParams }: { searchParams: { next?: string | string[]; loi?: string } }) {
  const next = safeNext(Array.isArray(searchParams.next) ? searchParams.next[0] : searchParams.next);
  if (await currentUser()) redirect(next);
  return (
    <div className="wrap">
      {searchParams.loi && (
        <p role="alert" className="mx-auto mb-4 max-w-md text-sm text-crimson">
          Đăng nhập không thành công, vui lòng thử lại.
        </p>
      )}
      <LoginForm next={next} />
    </div>
  );
}
