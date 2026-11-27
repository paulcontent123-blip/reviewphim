import Image from "next/image";

type Props = { src: string | null; title: string; priority?: boolean; compact?: boolean };

/** compact: khung hẹp như ảnh nhỏ trên thẻ review, chữ nhỏ hơn và cắt dòng. */
export function Poster({ src, title, priority, compact }: Props) {
  if (!src) {
    return (
      <div
        className={`flex h-full w-full items-center justify-center bg-gradient-to-br from-bg4 to-[#cfc7b8] text-center font-display font-bold text-fg2 ${compact ? "p-1 text-xs leading-tight" : "p-3 text-sm"}`}
      >
        <span className={compact ? "line-clamp-4 break-words" : undefined}>{title}</span>
      </div>
    );
  }
  return <Image src={src} alt={`Poster phim ${title}`} fill sizes="200px" className="object-cover" priority={priority} />;
}
