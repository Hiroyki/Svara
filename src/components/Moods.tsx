"use client";

import Link from "next/link";
import type { Chip } from "@/lib/types";

const moodHref = (c: Chip) => `/search?q=${encodeURIComponent(c.label + " playlist")}&tab=playlists`;

/** Genre & mood tiles for Browse: raised squares, label bottom-left, no decoration. */
export function MoodGrid({ chips }: { chips: Chip[] }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5">
      {chips.map((c) => (
        <Link
          key={c.label}
          href={moodHref(c)}
          className="group flex h-[76px] items-end rounded-xl bg-raised p-3.5 transition-colors hover:bg-white/10"
        >
          <span className="text-[14px] font-bold leading-tight text-muted transition-colors group-hover:text-ink">{c.label}</span>
        </Link>
      ))}
    </div>
  );
}
