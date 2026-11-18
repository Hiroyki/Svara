"use client";

import { ChevronDown, Loader2, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { rgb, useArtColor } from "@/lib/color";
import { useFetch } from "@/lib/fetcher";
import { fmtTime } from "@/lib/format";
import { useCurrent, usePlayer } from "@/lib/player";
import type { Lyrics } from "@/lib/types";
import { LikeButton, Progress, Transport } from "./PlayerBar";
import FollowLyrics from "./Lyrics";
import { Artists, Equalizer } from "./TrackList";

function LyricsPanel({ id }: { id: string }) {
  const { data, loading } = useFetch<Lyrics>(`/api/lyrics/${id}`);
  if (loading) return <Loader2 className="size-5 animate-spin text-white/60" />;
  if (!data?.text) {
    return (
      <div>
        <p className="text-3xl font-bold tracking-[-0.03em] text-white/90">No lyrics for this one.</p>
        <p className="mt-2 text-[14px] text-white/60">YouTube Music doesn&apos;t have them yet.</p>
      </div>
    );
  }
  return <FollowLyrics text={data.text} source={data.source} size="lg" className="h-full pr-4" />;
}

/** Decorative spectrum: 36 bars dancing while the song plays (the audio itself isn't readable from the player). */
function Visualizer({ playing }: { playing: boolean }) {
  return (
    <div aria-hidden className="flex h-10 items-end gap-[3px]">
      {Array.from({ length: 36 }, (_, i) => {
        const seed = Math.sin(i * 12.9898) * 43758.5453;
        const r = seed - Math.floor(seed);
        return (
          <span
            key={i}
            className="viz-bar w-full rounded-full bg-white/70"
            style={
              {
                height: `${30 + Math.sin((i / 35) * Math.PI) * 70}%`,
                "--viz-dur": `${0.6 + r * 0.8}s`,
                "--viz-delay": `${-r * 1.2}s`,
                animationPlayState: playing ? "running" : "paused",
              } as React.CSSProperties
            }
          />
        );
      })}
    </div>
  );
}

function QueuePanel() {
  const queue = usePlayer((s) => s.queue);
  const index = usePlayer((s) => s.index);
  const playing = usePlayer((s) => s.playing);
  const autoplay = usePlayer((s) => s.autoplay);
  const extending = usePlayer((s) => s.extending);
  const p = usePlayer.getState;
  const current = queue[index];
  const upcoming = queue.slice(index + 1);

  return (
    <div className="thin-scrollbar h-full overflow-y-auto pr-3">
      {current && (
        <>
          <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.18em] text-white/60">Now playing</p>
          <div className="mb-8 flex items-center gap-3.5">
            <img src={current.thumb} alt="" className="size-12 rounded-md object-cover" />
            <div className="min-w-0 flex-1">
              <div className="truncate text-[14.5px] font-semibold">{current.title}</div>
              <Artists track={current} className="block text-[12.5px] text-white/70" />
            </div>
            <Equalizer playing={playing} className="mr-1" />
          </div>
        </>
      )}

      <div className="mb-3 flex items-center justify-between">
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-white/60">Next up</p>
        <div className="flex items-center gap-4 text-[12px]">
          <button onClick={() => p().toggleAutoplay()} className={autoplay ? "font-semibold text-white" : "text-white/55 hover:text-white"}>
            Autoplay {autoplay ? "on" : "off"}
          </button>
          {upcoming.length > 0 && (
            <button onClick={() => p().clearUpcoming()} className="text-white/55 hover:text-white">
              Clear
            </button>
          )}
        </div>
      </div>

      <div>
        {upcoming.map((t, n) => {
          const i = index + 1 + n;
          return (
            <div key={`${t.id}-${i}`} className="group -mx-2 flex items-center gap-3.5 rounded-lg px-2 py-1.5 hover:bg-white/10">
              <button onClick={() => p().jumpTo(i)} className="flex min-w-0 flex-1 items-center gap-3.5 text-left">
                <img src={t.thumb} alt="" loading="lazy" className="size-10 rounded object-cover" />
                <span className="min-w-0">
                  <span className="block truncate text-[13.5px] font-medium">{t.title}</span>
                  <span className="block truncate text-[12px] text-white/60">{t.artists.map((a) => a.name).join(", ")}</span>
                </span>
              </button>
              <span className="text-[11.5px] font-semibold tabular-nums text-white/50 group-hover:hidden">{fmtTime(t.duration)}</span>
              <button onClick={() => p().removeAt(i)} className="hidden text-white/70 hover:text-white group-hover:block" aria-label="Remove from queue">
                <X className="size-4" />
              </button>
            </div>
          );
        })}
        {extending && (
          <p className="flex items-center gap-2 py-3 text-[13px] text-white/60">
            <Loader2 className="size-4 animate-spin" /> Finding similar songs
          </p>
        )}
        {!upcoming.length && !extending && (
          <p className="py-3 text-[13px] text-white/60">
            {autoplay ? "Similar songs get added when this one ends." : "Nothing queued. Add songs with the + button."}
          </p>
        )}
      </div>
    </div>
  );
}

export default function NowPlaying() {
  const open = usePlayer((s) => s.nowPlaying);
  const panel = usePlayer((s) => s.panel);
  const setOpen = usePlayer((s) => s.openNowPlaying);
  const playing = usePlayer((s) => s.playing);
  const position = usePlayer((s) => s.position);
  const duration = usePlayer((s) => s.duration);
  const current = useCurrent();
  const c = useArtColor(open ? current?.thumb : undefined);

  return (
    <AnimatePresence>
      {open && current && (
    <motion.div
      key="now-playing"
      initial={{ y: "100%" }}
      animate={{ y: 0 }}
      exit={{ y: "100%" }}
      transition={{ type: "spring", stiffness: 260, damping: 32 }}
      className="fixed inset-0 z-[60] overflow-hidden text-white transition-[background] duration-700"
      style={{ background: `linear-gradient(160deg, ${rgb(c)} 0%, ${rgb(c, 0.6)} 40%, ${rgb(c, 0)} 100%), #0c0c0d` }}
      role="dialog"
      aria-label="Now playing"
    >
      <div className="flex h-full flex-col px-6 pb-8 pt-6 sm:px-12">
        <div className="flex items-center justify-between">
          <button onClick={() => setOpen(false)} className="-ml-2 grid size-9 place-items-center text-white/80 hover:text-white" aria-label="Close">
            <ChevronDown className="size-6" />
          </button>
          <div className="flex gap-6 text-[13px]">
            {(["lyrics", "queue"] as const).map((k) => (
              <button
                key={k}
                onClick={() => setOpen(true, k)}
                className={`relative pb-1 capitalize transition-colors ${panel === k ? "font-semibold text-white" : "text-white/60 hover:text-white"}`}
              >
                {k}
                {panel === k && <span className="absolute inset-x-0 -bottom-0.5 h-[2px] rounded-full bg-white" />}
              </button>
            ))}
          </div>
        </div>

        <div className="mx-auto grid min-h-0 w-full max-w-6xl flex-1 items-center gap-16 py-8 lg:grid-cols-[minmax(0,440px)_minmax(0,1fr)]">
          <div className="flex flex-col">
            <img
              src={current.thumb}
              alt={current.title}
              className={`aspect-square w-full max-w-[min(440px,44vh)] rounded-[14px] object-cover shadow-[0_40px_80px_-28px_rgba(0,0,0,0.8)] transition-transform duration-700 ${
                playing ? "" : "scale-[0.96]"
              }`}
            />
            <div className="mt-8 flex max-w-[440px] items-start gap-3">
              <div className="min-w-0 flex-1">
                <h2 className="truncate text-[28px] font-bold leading-tight tracking-[-0.03em]">{current.title}</h2>
                <Artists track={current} className="mt-1 block text-[15px] text-white/75" />
              </div>
              <LikeButton />
            </div>
            <div className="mt-6 max-w-[440px]">
              <Visualizer playing={playing} />
              <Progress className="mt-3 w-full" />
              <div className="mt-1 flex justify-between text-[11.5px] font-semibold tabular-nums text-white/70">
                <span>{fmtTime(position)}</span>
                <span>{fmtTime(duration)}</span>
              </div>
            </div>
            <div className="mt-6 flex max-w-[440px] justify-center">
              <Transport size="lg" />
            </div>
            {current.album?.id && (
              <Link href={`/album?id=${current.album.id}`} onClick={() => setOpen(false)} className="mt-6 max-w-[440px] text-center text-[12.5px] text-white/60 hover:text-white">
                From <span className="font-semibold">{current.album.name}</span>
              </Link>
            )}
          </div>

          <div className="hidden h-[min(64vh,620px)] min-h-0 lg:block">{panel === "lyrics" ? <LyricsPanel id={current.id} /> : <QueuePanel />}</div>
        </div>
      </div>
    </motion.div>
      )}
    </AnimatePresence>
  );
}
