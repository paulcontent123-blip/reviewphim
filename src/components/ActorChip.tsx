import Image from "next/image";
import type { Actor } from "@/lib/types";

export function ActorChip({ actor }: { actor: Actor }) {
  return (
    <li className="w-20 shrink-0 text-center">
      <span className="relative mx-auto flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-bg4 font-bold text-fg2">
        {actor.avatar_url ? <Image src={actor.avatar_url} alt="" fill sizes="64px" className="object-cover" /> : actor.name[0]}
      </span>
      <span className="mt-1 block text-xs font-semibold leading-tight">{actor.name}</span>
      {actor.role && <span className="block text-[11px] leading-tight text-fg3">{actor.role}</span>}
    </li>
  );
}
