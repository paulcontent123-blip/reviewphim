"use client";
// This component is client-side only because it uses the `useAuth` hook, which relies on React state and effects.
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { browserClient } from "@/lib/supabase/browser";
import { useAuth } from "@/store/auth";

export function AccountButton() {
  const user = useAuth((s) => s.user);
  const path = usePathname();
  const router = useRouter();

  if (user === undefined) return <span className="block h-11 w-24" aria-hidden />;
  if (!user) {
    const href = path === "/dang-nhap" ? path : `/dang-nhap?next=${encodeURIComponent(path)}`;
    return (
      <Link href={href} className="btn-gold whitespace-nowrap px-3">
        Đăng nhập
      </Link>
    );
  }
  return (
    <button
      type="button"
      className="btn-ghost whitespace-nowrap px-3"
      title={user.email ?? undefined}
      onClick={async () => {
        await browserClient()?.auth.signOut();
        router.refresh();
      }}
    >
      Đăng xuất
    </button>
  );
}
