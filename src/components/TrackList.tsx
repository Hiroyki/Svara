"use client";

import { ChevronDown, ChevronUp, Heart, MoreHorizontal } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { fmtTime } from "@/lib/format";
import { useCurrent, useIsLiked, usePlayer } from "@/lib/player";
import type { Track } from "@/lib/types";
import { useUI } from "@/lib/ui";
import { Burst, EASE } from "./motion";

export function Equalizer({ playing, className = "" }: { playing: boolean; className?: string }) {
  return (
    <span className={`flex h-3 items-end gap-[2px] ${className}`} aria-hidden>
      {[0, 0.3, 0.12].map((d, i) => (
        <span
          key={i}
          className={`h-full w-[2.5px] origin-bottom rounded-full bg-current ${playing ? "animate-eq" : ""}`}
          style={{ animationDelay: `${d}s`, transform: playing ? undefined : `scaleY(${0.4 + i * 0.2})` }}
        />
      ))}
    </span>
  );
}

export function Artists({ track, className = "" }: { track: Track; className?: string }) {
  return (
    <span className={`truncate ${className}`}>
      {track.artists.map((a, i) => (
        <span key={i}>
          {i > 0 && ", "}
          {a.id ? (
            <Link href={`/artist?id=${a.id}`} onClick={(e) => e.stopPropagation()} className="hover:text-ink hover:underline">
              {a.name}
            </Link>
          ) : (
            a.name
          )}
        </span>
      ))}
    </span>
  );
}

type Opts = { art?: boolean; album?: boolean; playlistId?: string; numbered?: boolean };

const cols = (o: Opts) =>
  `${o.numbered ? "grid-cols-[24px_minmax(0,1fr)_auto]" : "grid-cols-[minmax(0,1fr)_auto]"} ${
    o.album ? (o.numbered ? "md:grid-cols-[24px_minmax(0,1.2fr)_minmax(0,1fr)_auto]" : "md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_auto]") : ""
  }`;

export function TrackRow({ track, index, onPlay, ...o }: Opts & { track: Track; index: number; onPlay: () => void }) {
  const current = useCurrent();
  const playing = usePlayer((s) => s.playing);
  const toggle = usePlayer((s) => s.toggle);
  const toggleLike = usePlayer((s) => s.toggleLike);
  const liked = useIsLiked(track.id);
  const openMenu = useUI((s) => s.openMenu);
  const active = current?.id === track.id;
  const [burst, setBurst] = useState(0);
  const art = o.art ?? true;

  const menu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    openMenu({ track, x: e.clientX, y: e.clientY, playlistId: o.playlistId });
  };

  return (
    <div
      role="button"
      tabIndex={0}
      aria-current={active || undefined}
      onClick={() => (active ? toggle() : onPlay())}
      onKeyDown={(e) => e.key === "Enter" && (active ? toggle() : onPlay())}
      onContextMenu={menu}
      className={`group grid h-12 cursor-pointer items-center gap-4 rounded-xl px-2 transition-colors hover:bg-hover ${cols(o)}`}
    >
      {o.numbered && (
        <span className={`text-[12.5px] font-semibold tabular-nums ${active ? "text-green" : "text-faint"}`}>
          {active ? <Equalizer playing={playing} /> : index + 1}
        </span>
      )}

      <div className="flex min-w-0 items-center gap-3">
        {art && <img src={track.thumb} alt="" loading="lazy" className="size-8 shrink-0 rounded-md bg-raised object-cover" />}
        <div className="min-w-0">
          <div className={`truncate text-[13.5px] font-semibold transition-transform duration-300 group-hover:translate-x-0.5 ${active ? "text-green" : ""}`}>{track.title}</div>
          <Artists track={track} className="block text-[12px] font-medium text-muted" />
        </div>
      </div>

      {o.album && (
        <div className="hidden min-w-0 truncate text-[13px] font-semibold md:block">
          {track.album?.id ? (
            <Link href={`/album?id=${track.album.id}`} onClick={(e) => e.stopPropagation()} className="hover:underline">
              {track.album.name}
            </Link>
          ) : (
            <span className="text-muted">{track.album?.name ?? "—"}</span>
          )}
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (!liked) setBurst((n) => n + 1);
            toggleLike(track);
          }}
          aria-label={liked ? "Remove from Favorite" : "Add to Favorite"}
          className={`relative grid size-7 place-items-center rounded-lg transition-colors hover:bg-hover ${liked ? "text-green" : "text-muted hover:text-ink"}`}
        >
          <motion.span key={liked ? "on" : "off"} initial={{ scale: liked ? 0.4 : 1 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 520, damping: 14 }}>
            <Heart className="size-[15px]" fill={liked ? "currentColor" : "none"} />
          </motion.span>
          {burst > 0 && <Burst key={burst} />}
        </button>
        <span className="hidden w-10 text-right text-[12.5px] font-semibold tabular-nums text-muted sm:block">{track.duration ? fmtTime(track.duration) : ""}</span>
        <button
          onClick={menu}
          aria-label="More options"
          className="grid size-7 place-items-center rounded-lg text-muted opacity-0 transition-opacity hover:bg-hover hover:text-ink focus-visible:opacity-100 group-hover:opacity-100"
        >
          <MoreHorizontal className="size-4" />
        </button>
      </div>
    </div>
  );
}

type SortKey = "index" | "title" | "album";

function SortHead({ label, k, sort, setSort, className = "" }: { label: string; k: SortKey; sort: { k: SortKey; asc: boolean }; setSort: (s: { k: SortKey; asc: boolean }) => void; className?: string }) {
  const on = sort.k === k;
  return (
    <button
      onClick={() => setSort(on && sort.asc ? { k, asc: false } : on && !sort.asc ? { k: "index", asc: true } : { k, asc: true })}
      className={`flex items-center gap-1 text-left transition-colors hover:text-ink ${on ? "text-ink" : ""} ${className}`}
    >
      {label}
      {on && k !== "index" ? sort.asc ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" /> : <ChevronUp className="size-3 opacity-40" />}
    </button>
  );
}

/** Track table: # · Name · Album · ♥ · time. Sortable by name and album. */
export default function TrackList({
  tracks,
  numbered = true,
  art = true,
  album = false,
  header = false,
  playlistId,
  onPlayAt,
}: Opts & { tracks: Track[]; header?: boolean; onPlayAt?: (i: number) => void }) {
  const playQueue = usePlayer((s) => s.playQueue);
  const [sort, setSort] = useState<{ k: SortKey; asc: boolean }>({ k: "index", asc: true });
  const rows = useMemo(() => {
    const list = tracks.map((t, i) => ({ t, i }));
    if (sort.k === "index") return list;
    const key = (r: { t: Track }) => (sort.k === "title" ? r.t.title : (r.t.album?.name ?? "")).toLowerCase();
    return [...list].sort((a, b) => key(a).localeCompare(key(b)) * (sort.asc ? 1 : -1));
  }, [tracks, sort]);
  // hide the Album column when the source has no album info (e.g. trending videos)
  const o = { numbered, art, album: album && tracks.filter((t) => t.album?.name).length >= tracks.length / 2, playlistId };

  return (
    <div>
      {header && (
        <div className={`mb-1 grid h-8 items-center gap-4 px-2 text-[11.5px] font-semibold text-faint ${cols(o)}`}>
          {numbered && <span>#</span>}
          <SortHead label="Name" k="title" sort={sort} setSort={setSort} />
          {o.album && <SortHead label="Album" k="album" sort={sort} setSort={setSort} className="hidden md:flex" />}
          <span />
        </div>
      )}
      {rows.map(({ t, i }, n) => (
        <motion.div
          key={`${t.id}-${i}`}
          layout="position"
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.35, ease: EASE, delay: (n % 8) * 0.03 }}
        >
          <TrackRow
            track={t}
            index={sort.k === "index" ? i : n}
            {...o}
            onPlay={() => {
              const ordered = rows.map((r) => r.t);
              if (onPlayAt && sort.k === "index") onPlayAt(i);
              else playQueue(ordered, n);
            }}
          />
        </motion.div>
      ))}
    </div>
  );
}
