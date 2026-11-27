import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/data/admin";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Quản trị", robots: { index: false, follow: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin("/admin");
  return (
    <div className="wrap">
      <nav aria-label="Quản trị" className="mb-5 flex flex-wrap gap-2">
        <Link href="/admin/phim" className="chip" prefetch={false}>
          Phim và link xem
        </Link>
        <Link href="/admin/review" className="chip" prefetch={false}>
          Review
        </Link>
      </nav>
      {children}
    </div>
  );
}
