import Link from "next/link";
import { AccountButton } from "./AccountButton";
import { AdminLink } from "./AdminLink";

export function NavBar() {
  return (
    <header className="sticky top-0 z-50 border-b border-line bg-bg/95 backdrop-blur">
      <nav aria-label="Chính" className="mx-auto flex max-w-page flex-wrap items-center gap-x-3 px-4 py-1.5 sm:flex-nowrap sm:px-5">
        <Link href="/" className="flex min-h-[44px] items-center font-display text-lg font-bold">
          Review<span className="text-crimson">Phim</span>
          <span className="ml-0.5 text-[11px] text-fg3">.vn</span>
        </Link>
        <Link href="/review" className="flex min-h-[44px] items-center px-2 text-sm font-medium text-fg2 hover:text-fg">
          Review
        </Link>
        <div className="ml-auto sm:order-3 sm:ml-0">
          <AccountButton />
        </div>
        {/* Link quản trị nằm cùng hàng ô tìm kiếm để thanh đầu không chật trên điện thoại. */}
        <div className="order-last flex w-full items-center gap-2 pb-1.5 sm:order-2 sm:ml-auto sm:w-auto sm:pb-0">
          <form action="/tim-kiem" role="search" className="flex-1 sm:w-64 sm:flex-none">
            <input name="q" type="search" required maxLength={80} placeholder="Tìm phim..." aria-label="Tìm phim" className="field rounded-full" />
          </form>
          <AdminLink />
        </div>
      </nav>
    </header>
  );
}
