"use client";

import { GripVertical, Heart, Loader2 } from "lucide-react";
import { AnimatePresence, motion, Reorder, useDragControls } from "motion/react";
import Link from "next/link";
import { useState } from "react";
import { HOME_URL, useFetch } from "@/lib/fetcher";
import { fmtTime, fmtTotal } from "@/lib/format";
import { useCurrent, useIsLiked, usePlayer } from "@/lib/player";
import type { Card, Collection, HomeData, Lyrics, Track } from "@/lib/types";
import FollowLyrics from "./Lyrics";
import { Equalizer } from "./TrackList";
import { EASE } from "./motion";
import { Label } from "./ui";

/** Compact list used in the side panel: green square with equalizer marks the playing row. */
function MiniList({ tracks, onPlay }: { tracks: Track[]; onPlay: (i: number) => void }) {
  const current = useCurrent();
  const playing = usePlayer((s) => s.playing);
  return (
    <div className="space-y-0.5">
      {tracks.map((t, i) => {
        const active = current?.id === t.id;
        return (
          <button key={`${t.id}-${i}`} onClick={() => onPlay(i)} className="flex w-full items-center gap-3 rounded-xl p-1.5 text-left transition-colors hover:bg-hover">
            {active ? (
              <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-green text-app">
                <Equalizer playing={playing} />
              </span>
            ) : (
              <img src={t.thumb} alt="" loading="lazy" className="size-9 shrink-0 rounded-lg bg-raised object-cover" />
            )}
            <span className="min-w-0 flex-1">
              <span className={`block truncate text-[13px] font-semibold ${active ? "text-green" : ""}`}>{t.title}</span>
              <span className="block truncate text-[11.5px] font-medium text-muted">{t.artists.map((a) => a.name).join(", ")}</span>
            </span>
            <span className="text-[11.5px] font-semibold tabular-nums text-faint">{t.duration ? fmtTime(t.duration) : ""}</span>
          </button>
        );
      })}
    </div>
  );
}

function Cover({ src, href }: { src: string; href?: string }) {
  const img = <img src={src} alt="" className="relative aspect-square w-full rounded-xl bg-raised object-cover" />;
  return href ? (
    <Link href={href} className="relative block transition-transform duration-500 hover:scale-[1.015]">
      {img}
    </Link>
  ) : (
    img
  );
}

/** Cover with a vinyl record that slides out and spins while the song plays. */
function VinylCover({ src, href, playing }: { src: string; href?: string; playing: boolean }) {
  return (
    <div className="relative">
      {/* the artwork's own colours, blurred behind it, breathing while music plays */}
      {playing && <img src={src} alt="" aria-hidden className="breathe absolute inset-4 size-[calc(100%-32px)] rounded-full object-cover blur-2xl saturate-150" />}
      <div className="relative w-[84%]">
        <motion.div
          aria-hidden
          className="absolute inset-[5%] rounded-full"
          animate={{ x: playing ? "17%" : "0%" }}
          transition={{ type: "spring", stiffness: 110, damping: 17 }}
        >
          <div
            className="vinyl relative size-full rounded-full shadow-[0_10px_30px_-8px_rgba(0,0,0,0.8)] ring-1 ring-white/15"
            style={{
              animationPlayState: playing ? "running" : "paused",
              background:
                "radial-gradient(circle, transparent 31%, rgba(255,255,255,0.1) 31.5%, transparent 32.5%), repeating-radial-gradient(circle, #141416 0 1.5px, #2a2a2e 1.5px 3px)",
            }}
          >
            <img src={src} alt="" className="absolute inset-[33%] size-[34%] rounded-full object-cover" />
            <span className="absolute left-1/2 top-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-app" />
            {/* sheen */}
            <span className="absolute inset-0 rounded-full bg-[conic-gradient(from_30deg,transparent_0_20%,rgba(255,255,255,0.08)_25%,transparent_32%_70%,rgba(255,255,255,0.06)_75%,transparent_82%)]" />
          </div>
        </motion.div>
        <div className="relative shadow-[8px_0_24px_-6px_rgba(0,0,0,0.7)]">
          <Cover src={src} href={href} />
        </div>
      </div>
    </div>
  );
}

const keys = new WeakMap<Track, string>();
let keySeq = 0;
const keyOf = (t: Track) => {
  let k = keys.get(t);
  if (!k) keys.set(t, (k = `q${++keySeq}`));
  return k;
};

function QueueRow({ track, onPlay }: { track: Track; onPlay: () => void }) {
  const controls = useDragControls();
  return (
    <Reorder.Item
      value={track}
      dragListener={false}
      dragControls={controls}
      className="group relative flex items-center gap-2 rounded-xl bg-panel p-1.5 transition-colors hover:bg-raised"
      whileDrag={{ scale: 1.03, boxShadow: "0 14px 30px -10px rgba(0,0,0,0.7)", zIndex: 10 }}
      layout="position"
    >
      <span
        onPointerDown={(e) => controls.start(e)}
        className="grid h-9 w-4 shrink-0 cursor-grab touch-none place-items-center text-faint opacity-0 transition-opacity group-hover:opacity-100 active:cursor-grabbing"
        aria-label="Drag to reorder"
      >
        <GripVertical className="size-3.5" />
      </span>
      <button onClick={onPlay} className="flex min-w-0 flex-1 items-center gap-3 text-left">
        <img src={track.thumb} alt="" loading="lazy" className="size-9 shrink-0 rounded-lg bg-raised object-cover" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-semibold">{track.title}</span>
          <span className="block truncate text-[11.5px] font-medium text-muted">{track.artists.map((a) => a.name).join(", ")}</span>
        </span>
        <span className="text-[11.5px] font-semibold tabular-nums text-faint">{track.duration ? fmtTime(track.duration) : ""}</span>
      </button>
    </Reorder.Item>
  );
}

/** Up next, reorderable by dragging the grip. */
function UpNext() {
  const queue = usePlayer((s) => s.queue);
  const index = usePlayer((s) => s.index);
  const jumpTo = usePlayer((s) => s.jumpTo);
  const reorder = usePlayer((s) => s.reorderUpcoming);
  const current = queue[index];
  const upcoming = queue.slice(index + 1, index + 31);
  return (
    <div>
      {current && <MiniList tracks={[current]} onPlay={() => jumpTo(index)} />}
      {upcoming.length ? (
        <Reorder.Group axis="y" values={upcoming} onReorder={reorder} className="mt-0.5 space-y-0.5">
          {upcoming.map((t, i) => (
            <QueueRow key={keyOf(t)} track={t} onPlay={() => jumpTo(index + 1 + i)} />
          ))}
        </Reorder.Group>
      ) : (
        <p className="px-1.5 pt-3 text-[12.5px] text-muted">Similar songs get added when this one ends.</p>
      )}
    </div>
  );
}

function NowPlayingSide({ track }: { track: Track }) {
  const toggleLike = usePlayer((s) => s.toggleLike);
  const liked = useIsLiked(track.id);
  const [tab, setTab] = useState<"next" | "lyrics">("next");
  const lyrics = useFetch<Lyrics>(tab === "lyrics" ? `/api/lyrics/${track.id}` : null);
  const playing = usePlayer((s) => s.playing);

  return (
    <>
      <VinylCover src={track.thumb} href={track.album?.id ? `/album?id=${track.album.id}` : undefined} playing={playing} />
      <Label className="mt-4">Now playing</Label>
      <h2 className="mt-1 line-clamp-2 text-[22px] font-extrabold leading-tight tracking-[-0.02em]">{track.title}</h2>
      <p className="mt-1 truncate text-[13px] font-medium text-muted">
        {track.artists.map((a, i) => (
          <span key={i}>
            {i > 0 && ", "}
            {a.id ? (
              <Link href={`/artist?id=${a.id}`} className="hover:text-ink hover:underline">
                {a.name}
              </Link>
            ) : (
              a.name
            )}
          </span>
        ))}
      </p>
      <div className="mt-3 flex items-center gap-2">
        <button
          onClick={() => toggleLike(track)}
          className={`flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[12px] font-semibold transition-colors ${liked ? "bg-green-soft text-green" : "bg-raised text-muted hover:text-ink"}`}
        >
          <Heart className="size-3.5" fill={liked ? "currentColor" : "none"} /> {liked ? "Liked" : "Like"}
        </button>
        {track.album?.name && <span className="truncate text-[12px] font-medium text-faint">{track.album.name}</span>}
      </div>

      <div className="mt-5 flex gap-4 border-b border-line text-[12.5px] font-semibold">
        {(["next", "lyrics"] as const).map((k) => (
          <button key={k} onClick={() => setTab(k)} className={`relative pb-2 transition-colors ${tab === k ? "text-ink" : "text-faint hover:text-muted"}`}>
            {k === "next" ? "Up next" : "Lyrics"}
            {tab === k && <motion.span layoutId="side-tab" className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-green" />}
          </button>
        ))}
      </div>
      <div className="mt-2">
        {tab === "next" ? (
          <UpNext />
        ) : lyrics.loading ? (
          <Loader2 className="mt-4 size-4 animate-spin text-muted" />
        ) : lyrics.data?.text ? (
          <FollowLyrics text={lyrics.data.text} source={lyrics.data.source} className="h-[360px]" />
        ) : (
          <p className="pt-3 text-[13px] text-muted">No lyrics for this song.</p>
        )}
      </div>
    </>
  );
}

function Curated({ card }: { card: Card }) {
  const { data } = useFetch<Collection>(`/api/album/${card.id}`);
  const playQueue = usePlayer((s) => s.playQueue);
  if (!data) {
    return (
      <div className="space-y-3">
        <div className="aspect-square w-full animate-pulse rounded-xl bg-raised" />
        <div className="h-3 w-1/3 animate-pulse rounded-full bg-raised" />
        <div className="h-5 w-2/3 animate-pulse rounded-full bg-raised" />
      </div>
    );
  }
  const by = data.artists.map((a) => a.name).join(", ");
  const blurb = data.description || `${data.subtitle.split(" • ")[0] || "Album"} by ${by}${data.subtitle.match(/\d{4}/) ? `, released ${data.subtitle.match(/\d{4}/)![0]}` : ""}.`;
  return (
    <>
      <Cover src={data.thumb} href={`/album?id=${data.id}`} />
      <Label className="mt-4">Curated album</Label>
      <Link href={`/album?id=${data.id}`} className="mt-1 block line-clamp-2 text-[22px] font-extrabold leading-tight tracking-[-0.02em] hover:underline">
        {data.title}
      </Link>
      <p className="mt-2 line-clamp-3 text-[12.5px] font-medium leading-relaxed text-muted">{blurb}</p>
      <span className="mt-3 inline-flex h-8 items-center gap-2 rounded-lg bg-raised px-2.5 text-[12px] font-semibold text-muted">
        {data.tracks.length} songs · {fmtTotal(data.tracks)}
      </span>
      <div className="mt-4">
        <MiniList tracks={data.tracks.slice(0, 12)} onPlay={(i) => playQueue(data.tracks, i)} />
      </div>
    </>
  );
}

export default function RightPanel() {
  const current = useCurrent();
  const { data } = useFetch<HomeData>(current ? null : HOME_URL);
  const album = data?.sections.flatMap((s) => s.cards ?? []).find((c) => c.kind === "album");

  return (
    <aside className="thin-scrollbar animate-in hidden min-h-0 overflow-y-auto rounded-2xl bg-panel p-4 [animation-delay:calc(var(--intro-delay,0ms)+180ms)] xl:col-start-3 xl:row-start-2 xl:block">
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={current?.id ?? album?.id ?? "empty"}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.3, ease: EASE }}
        >
          {current ? <NowPlayingSide track={current} /> : album ? <Curated card={album} /> : null}
        </motion.div>
      </AnimatePresence>
    </aside>
  );
}
