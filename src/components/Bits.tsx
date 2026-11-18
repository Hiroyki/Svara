"use client";

import { Shuffle } from "lucide-react";
import Link from "next/link";
import { useCurrent, usePlayer } from "@/lib/player";
import type { ArtistRef, Track } from "@/lib/types";
import { IconButton, PlayDisc } from "./ui";

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-raised ${className}`} />;
}

export function RowsSkeleton({ n = 6 }: { n?: number }) {
  return (
    <div>
      {Array.from({ length: n }, (_, i) => (
        <div key={i} className="flex h-12 items-center gap-3 px-2">
          <Skeleton className="size-8 rounded-md" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-2.5 w-2/5 rounded-full" />
            <Skeleton className="h-2 w-1/4 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function CardsSkeleton({ n = 6 }: { n?: number }) {
  return (
    <div className="flex gap-4 overflow-hidden">
      {Array.from({ length: n }, (_, i) => (
        <div key={i} className="w-[154px] shrink-0">
          <Skeleton className="aspect-square rounded-[10px]" />
          <Skeleton className="mt-3 h-2.5 w-3/4 rounded-full" />
          <Skeleton className="mt-2 h-2 w-1/2 rounded-full" />
        </div>
      ))}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <div className="py-24 text-center">
      <p className="text-lg font-bold">Couldn&apos;t reach YouTube Music</p>
      <p className="mx-auto mt-1 max-w-sm text-[13px] text-muted">{message ?? "Something went wrong."}</p>
      {onRetry && (
        <button onClick={onRetry} className="mt-5 rounded-full bg-raised px-5 py-2 text-[13px] font-semibold transition-colors hover:bg-white/10">
          Try again
        </button>
      )}
    </div>
  );
}

export function EmptyState({ title, text, children }: { title: string; text: string; children?: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-line py-16 text-center">
      <p className="text-lg font-bold">{title}</p>
      <p className="mx-auto mt-1 max-w-sm text-[13px] text-muted">{text}</p>
      {children}
    </div>
  );
}

export function ArtistLinks({ artists }: { artists: ArtistRef[] }) {
  return (
    <>
      {artists.map((a, i) => (
        <span key={i}>
          {i > 0 && ", "}
          {a.id ? (
            <Link href={`/artist?id=${a.id}`} className="font-bold text-white hover:underline">
              {a.name}
            </Link>
          ) : (
            <span className="font-bold text-white">{a.name}</span>
          )}
        </span>
      ))}
    </>
  );
}

/** Green play disc that knows whether this list is playing, plus shuffle. */
export function ActionRow({ tracks, children }: { tracks: Track[]; children?: React.ReactNode }) {
  const current = useCurrent();
  const playing = usePlayer((s) => s.playing);
  const playQueue = usePlayer((s) => s.playQueue);
  const toggle = usePlayer((s) => s.toggle);
  const isThis = !!current && tracks.some((t) => t.id === current.id);
  return (
    <div className="mt-5 flex items-center gap-2">
      <PlayDisc size="lg" playing={isThis && playing} disabled={!tracks.length} onClick={() => (isThis ? toggle() : playQueue(tracks, 0, { shuffle: false }))} />
      <IconButton label="Shuffle play" onClick={() => tracks.length && playQueue(tracks, 0, { shuffle: true })} className="ml-1 size-10 text-white/80">
        <Shuffle className="size-[18px]" />
      </IconButton>
      {children}
    </div>
  );
}

/** Album / playlist / library header: darkened grayscale artwork behind the cover. */
export function CollectionHeader({
  type,
  title,
  thumb,
  art,
  meta,
  actions,
  titleSlot,
}: {
  type: string;
  title: string;
  thumb?: string;
  art?: React.ReactNode;
  meta?: React.ReactNode;
  actions?: React.ReactNode;
  titleSlot?: React.ReactNode;
}) {
  const long = title.length > 26;
  return (
    <section className="animate-in relative isolate overflow-hidden rounded-2xl bg-raised p-5 sm:p-6">
      {thumb && <img src={thumb} alt="" className="absolute inset-0 -z-10 size-full scale-125 object-cover blur-2xl brightness-[0.35] grayscale" />}
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end">
        <div className="size-40 shrink-0 overflow-hidden rounded-xl bg-panel sm:size-[176px]">{thumb ? <img src={thumb} alt="" className="size-full object-cover" /> : art}</div>
        <div className="min-w-0 flex-1">
          <p className="text-[12px] font-semibold text-white/80">{type}</p>
          {titleSlot ?? (
            <h1 className={`mt-1 line-clamp-2 font-extrabold leading-[1] tracking-[-0.03em] text-white ${long ? "text-3xl sm:text-4xl" : "text-4xl sm:text-5xl"}`}>{title}</h1>
          )}
          {meta && <p className="mt-3 text-[12.5px] font-medium text-white/75">{meta}</p>}
          {actions}
        </div>
      </div>
    </section>
  );
}
