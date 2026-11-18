"use client";

import { Heart, ListMusic, MicVocal, Repeat, Repeat1, Shuffle, SkipBack, SkipForward, Volume1, Volume2, VolumeX } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useLayoutEffect, useRef, useState } from "react";
import { fmtTime } from "@/lib/format";
import { useCurrent, useIsLiked, usePlayer } from "@/lib/player";
import { Burst, EASE } from "./motion";
import { Equalizer } from "./TrackList";
import { IconButton, PlayDisc } from "./ui";

/** Green progress bar; thumb and time tooltip appear on hover. */
export function Progress({ className = "" }: { className?: string }) {
  const position = usePlayer((s) => s.position);
  const duration = usePlayer((s) => s.duration);
  const seek = usePlayer((s) => s.seek);
  const [hover, setHover] = useState<number | null>(null);
  const dragging = useRef(false);
  const pct = duration ? Math.min(100, (position / duration) * 100) : 0;
  const at = (e: React.PointerEvent) => {
    const r = e.currentTarget.getBoundingClientRect();
    return Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
  };
  const enabled = duration > 0;

  return (
    <div
      className={`group relative flex h-4 cursor-pointer touch-none items-center ${enabled ? "" : "pointer-events-none"} ${className}`}
      onPointerDown={(e) => {
        dragging.current = true;
        e.currentTarget.setPointerCapture(e.pointerId);
        seek(at(e) * duration);
      }}
      onPointerMove={(e) => {
        const f = at(e);
        setHover(f);
        if (dragging.current) seek(f * duration);
      }}
      onPointerUp={() => (dragging.current = false)}
      onPointerLeave={() => setHover(null)}
      role="slider"
      tabIndex={enabled ? 0 : -1}
      aria-label="Seek"
      aria-valuemin={0}
      aria-valuemax={Math.round(duration)}
      aria-valuenow={Math.round(position)}
      aria-valuetext={`${fmtTime(position)} of ${fmtTime(duration)}`}
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") seek(Math.min(duration, position + 5));
        if (e.key === "ArrowLeft") seek(Math.max(0, position - 5));
      }}
    >
      <div className="relative h-1 w-full overflow-hidden rounded-full bg-white/12">
        <div className="absolute inset-y-0 left-0 rounded-full bg-green transition-[width] duration-300 ease-linear" style={{ width: `${pct}%` }} />
      </div>
      <span
        className="pointer-events-none absolute size-3 -translate-x-1/2 scale-50 rounded-full bg-white opacity-0 shadow transition-[opacity,transform,left] duration-300 ease-linear group-hover:scale-100 group-hover:opacity-100"
        style={{ left: `${pct}%` }}
      />
      {hover !== null && (
        <span
          className="pointer-events-none absolute -top-7 -translate-x-1/2 rounded-md bg-raised px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-ink"
          style={{ left: `${hover * 100}%` }}
        >
          {fmtTime(hover * duration)}
        </span>
      )}
    </div>
  );
}

export function Transport({ size = "md" }: { size?: "md" | "lg" }) {
  const shuffle = usePlayer((s) => s.shuffle);
  const repeat = usePlayer((s) => s.repeat);
  const playing = usePlayer((s) => s.playing);
  const buffering = usePlayer((s) => s.buffering);
  const hasTrack = usePlayer((s) => s.queue.length > 0);
  const p = usePlayer.getState;
  const ic = size === "lg" ? "size-5" : "size-4";
  return (
    <div className={`flex items-center ${size === "lg" ? "gap-5" : "gap-2"}`}>
      <IconButton label={`Repeat ${repeat}`} active={repeat !== "off"} onClick={() => p().cycleRepeat()}>
        {repeat === "one" ? <Repeat1 className={ic} /> : <Repeat className={ic} />}
      </IconButton>
      <IconButton label="Previous" onClick={() => p().prev()}>
        <SkipBack className={ic} fill="currentColor" />
      </IconButton>
      <PlayDisc tone="white" size={size === "lg" ? "lg" : "md"} playing={playing} loading={buffering && playing} disabled={!hasTrack} onClick={() => p().toggle()} />
      <IconButton label="Next" onClick={() => p().next()}>
        <SkipForward className={ic} fill="currentColor" />
      </IconButton>
      <IconButton label="Shuffle" active={shuffle} onClick={() => p().toggleShuffle()}>
        <Shuffle className={ic} />
      </IconButton>
    </div>
  );
}

export function LikeButton() {
  const current = useCurrent();
  const liked = useIsLiked(current?.id);
  const toggleLike = usePlayer((s) => s.toggleLike);
  const [burst, setBurst] = useState(0);
  if (!current) return null;
  return (
    <IconButton
      label={liked ? "Remove from Favorite" : "Add to Favorite"}
      active={liked}
      className="relative"
      onClick={() => {
        if (!liked) setBurst((n) => n + 1);
        toggleLike(current);
      }}
    >
      <motion.span key={liked ? "on" : "off"} initial={{ scale: liked ? 0.4 : 1 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 520, damping: 14 }}>
        <Heart className="size-4" fill={liked ? "currentColor" : "none"} />
      </motion.span>
      {burst > 0 && <Burst key={burst} />}
    </IconButton>
  );
}

function Volume() {
  const volume = usePlayer((s) => s.volume);
  const muted = usePlayer((s) => s.muted);
  const setVolume = usePlayer((s) => s.setVolume);
  const toggleMute = usePlayer((s) => s.toggleMute);
  const v = muted ? 0 : volume;
  const Icon = v === 0 ? VolumeX : v < 0.5 ? Volume1 : Volume2;
  return (
    <div className="hidden items-center gap-1.5 lg:flex">
      <IconButton label={muted ? "Unmute" : "Mute"} onClick={toggleMute}>
        <Icon className="size-4" />
      </IconButton>
      <input
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={v}
        onChange={(e) => setVolume(Number(e.target.value))}
        className="svara-range w-24"
        style={{ "--fill": `${v * 100}%` } as React.CSSProperties}
        aria-label="Volume"
      />
    </div>
  );
}

/** Text that slowly drifts to reveal itself when it doesn't fit. */
export function Marquee({ text, className = "" }: { text: string; className?: string }) {
  const box = useRef<HTMLSpanElement>(null);
  const inner = useRef<HTMLSpanElement>(null);
  const [shift, setShift] = useState(0);
  useLayoutEffect(() => {
    const measure = () => {
      if (!box.current || !inner.current) return;
      const over = inner.current.scrollWidth - box.current.clientWidth;
      setShift(over > 4 ? over + 12 : 0);
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (box.current) ro.observe(box.current);
    return () => ro.disconnect();
  }, [text]);
  return (
    <span ref={box} className={`block overflow-hidden whitespace-nowrap ${shift ? "[mask-image:linear-gradient(90deg,#000_85%,transparent)]" : ""} ${className}`}>
      <span
        ref={inner}
        className={`inline-block ${shift ? "marquee" : ""}`}
        style={shift ? ({ "--shift": `-${shift}px`, "--marquee-dur": `${Math.max(5, shift / 18)}s` } as React.CSSProperties) : undefined}
      >
        {text}
      </span>
    </span>
  );
}

export default function PlayerBar() {
  const current = useCurrent();
  const position = usePlayer((s) => s.position);
  const duration = usePlayer((s) => s.duration);
  const open = usePlayer((s) => s.openNowPlaying);
  const nowPlaying = usePlayer((s) => s.nowPlaying);
  const panel = usePlayer((s) => s.panel);
  const playing = usePlayer((s) => s.playing);
  const toggle = usePlayer((s) => s.toggle);
  const total = duration || current?.duration || 0;

  return (
    <section
      aria-label="Player"
      className="animate-in relative flex min-w-0 items-center gap-4 rounded-2xl bg-panel [animation-delay:calc(var(--intro-delay,0ms)+240ms)] px-3 md:col-start-2 md:row-start-3 md:gap-6 md:px-4 xl:col-span-2"
    >
      {/* track */}
      <div className="flex min-w-0 flex-1 items-center gap-3 md:w-[240px] md:flex-none lg:w-[280px]">
        {current ? (
          <AnimatePresence mode="popLayout" initial={false}>
          <motion.div
            key={current.id}
            className="flex min-w-0 flex-1 items-center gap-3"
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 }}
            transition={{ duration: 0.35, ease: EASE }}
          >
            <button
              onClick={() => open(true)}
              className={`size-12 shrink-0 overflow-hidden rounded-[10px] bg-raised transition-transform duration-700 md:size-[54px] ${playing ? "scale-100" : "scale-90"}`}
              aria-label="Open Now Playing"
            >
              <img src={current.thumb} alt="" className="size-full object-cover" />
            </button>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 truncate text-[12px] font-medium text-muted">
                {playing && <Equalizer playing className="shrink-0 text-green" />}
                {current.artists.map((a, i) => (
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
              </div>
              <button onClick={() => open(true)} className="mt-0.5 block w-full text-left text-[14.5px] font-bold">
                <Marquee text={current.title} />
              </button>
            </div>
          </motion.div>
          </AnimatePresence>
        ) : (
          <>
            <span className="size-12 shrink-0 rounded-[10px] bg-raised md:size-[54px]" />
            <div className="min-w-0">
              <p className="text-[12px] font-medium text-muted">Nothing playing</p>
              <p className="mt-0.5 text-[14.5px] font-bold">Pick a song</p>
            </div>
          </>
        )}
      </div>

      {/* transport + progress */}
      <div className="hidden min-w-0 flex-1 flex-col items-center gap-1 md:flex">
        <Transport />
        <div className="flex w-full max-w-[640px] items-center gap-3 text-[11.5px] font-semibold tabular-nums text-muted">
          <span className="w-10 text-right">{fmtTime(position)}</span>
          <Progress className="flex-1" />
          <span className="w-10">{fmtTime(total)}</span>
        </div>
      </div>

      {/* utilities */}
      <div className="flex items-center gap-0.5">
        <div className="md:hidden">
          <PlayDisc tone="white" size="sm" playing={playing} disabled={!current} onClick={toggle} />
        </div>
        <div className="hidden items-center gap-0.5 md:flex">
          <IconButton label="Lyrics" active={nowPlaying && panel === "lyrics"} onClick={() => open(!(nowPlaying && panel === "lyrics"), "lyrics")}>
            <MicVocal className="size-4" />
          </IconButton>
          <IconButton label="Queue" active={nowPlaying && panel === "queue"} onClick={() => open(!(nowPlaying && panel === "queue"), "queue")}>
            <ListMusic className="size-4" />
          </IconButton>
          <LikeButton />
        </div>
        <Volume />
      </div>

      {current && (
        <div className="absolute inset-x-3 bottom-1.5 h-0.5 overflow-hidden rounded-full bg-white/10 md:hidden">
          <div className="h-full bg-green" style={{ width: `${total ? (position / total) * 100 : 0}%` }} />
        </div>
      )}
    </section>
  );
}
