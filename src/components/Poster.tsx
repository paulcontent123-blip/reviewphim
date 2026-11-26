import Image from "next/image";

export function Poster({ src, title, priority }: { src: string | null; title: string; priority?: boolean }) {
  if (!src) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-bg4 to-[#cfc7b8] p-3 text-center font-display text-sm font-bold text-fg2">
        {title}
      </div>
    );
  }
  return <Image src={src} alt={`Poster phim ${title}`} fill sizes="200px" className="object-cover" priority={priority} />;
}
