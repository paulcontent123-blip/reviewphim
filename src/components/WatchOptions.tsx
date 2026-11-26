import { optionAction, optionDetail, PLATFORMS, sortOptions } from "@/lib/platforms";
import type { WatchOption } from "@/lib/types";

export function WatchOptions({ options }: { options: WatchOption[] }) {
  return (
    <section id="xem-o-dau" className="card scroll-mt-32 p-4">
      <h2 className="sec-title mb-3">Xem ở đâu</h2>
      {!options.length && <p className="text-sm text-fg2">Chưa có thông tin nơi xem phim này.</p>}
      <ul className="space-y-2">
        {sortOptions(options).map((o) => (
          <li key={o.id}>
            {/* Thẻ a thường, không dùng Link: tránh prefetch làm sai số lượt click. */}
            <a
              href={`/go/${o.id}`}
              target="_blank"
              rel="sponsored nofollow noopener"
              className="flex min-h-[56px] items-center gap-3 rounded-lg border border-line bg-bg3 px-3 py-2 hover:border-gold"
            >
              <span
                aria-hidden
                className="flex h-9 w-9 items-center justify-center rounded-lg text-sm font-bold text-white"
                style={{ background: PLATFORMS[o.platform].color }}
              >
                {PLATFORMS[o.platform].name[0]}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold">{PLATFORMS[o.platform].name}</span>
                <span className="block text-xs text-fg3">{optionDetail(o)}</span>
              </span>
              <span className="text-sm font-semibold text-goldtext">{optionAction(o)} →</span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
