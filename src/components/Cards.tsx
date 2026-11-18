"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { getCached, prefetch } from "@/lib/fetcher";
import { hrefFor } from "@/lib/format";
import { usePlayer } from "@/lib/player";
import type { ArtistPage, Card, Collection, Track } from "@/lib/types";
import { toast } from "@/lib/ui";
import { Item, Reveal, Stagger } from "./motion";
import { PlayDisc, SectionHead } from "./ui";

export function apiFor(card: Card): string | null {
  if (card.kind === "album") return `/api/album/${card.id}`;
  if (card.kind === "playlist") return `/api/playlist/${card.id}`;
  if (card.kind === "artist") return `/api/artist/${card.id}`;
  return null;
}

/** Resolve any card to tracks and start playing. */
export function usePlayCard() {
  const [loading, setLoading] = useState<string | null>(null);
  const play = async (card: Card) => {
    const s = usePlayer.getState();
    if (card.track) return s.playTrack(card.track);
    const url = apiFor(card);
    if (!url) return;
    setLoading(card.id);
    try {
      const tracks: Track[] =
        card.kind === "artist" ? (await getCached<ArtistPage>(url)).topSongs : (await getCached<Collection>(url)).tracks;
      if (!tracks.length) toast("Nothing playable here yet");
      else if (card.kind === "artist") s.playTrack(tracks[0]);
      else s.playQueue(tracks, 0);
    } catch {
      toast("Couldn't load that. Try again.");
    } finally {
      setLoading(null);
    }
  };
  return { play, loading };
}

const kindLabel = (s: string) => s.replace(/^(Artist|Album|Song|Video|Playlist)\s•\s/, "");

/** Square cover + two lines. A green play disc appears on hover. */
export function MediaCard({ card, onPlay, loading, fluid }: { card: Card; onPlay: (c: Card) => void; loading?: boolean; fluid?: boolean }) {
  const router = useRouter();
  const href = hrefFor(card);
  const api = apiFor(card);
  const round = card.kind === "artist";
  return (
    <div
      className={`group relative shrink-0 snap-start rounded-xl p-2 transition-colors hover:bg-hover ${fluid ? "" : "w-[158px] sm:w-[170px]"}`}
      onMouseEnter={() => api && prefetch(api)}
    >
      <div className={`relative aspect-square overflow-hidden bg-raised ${round ? "rounded-full" : "rounded-[10px]"}`}>
        {card.thumb && (
          <img src={card.thumb} alt="" loading="lazy" className="size-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.06]" />
        )}
        <div
          className={`absolute bottom-2 right-2 z-10 transition-[opacity,transform] duration-200 ${
            loading ? "opacity-100" : "translate-y-1 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:opacity-100"
          }`}
        >
          <PlayDisc
            size="md"
            loading={loading}
            label={`Play ${card.title}`}
            onClick={(e) => {
              e.stopPropagation();
              onPlay(card);
            }}
          />
        </div>
      </div>
      <button onClick={() => (href ? router.push(href) : onPlay(card))} className={`mt-2.5 block w-full text-left after:absolute after:inset-0 ${round ? "text-center" : ""}`}>
        <span className="block truncate text-[13.5px] font-bold">{card.title}</span>
        <span className="mt-0.5 block truncate text-[12px] font-medium text-muted">{kindLabel(card.subtitle)}</span>
      </button>
    </div>
  );
}

/** Compact release row: cover square + title / artist / meta. Laid out three across. */
export function ReleaseTile({ card, onPlay, loading }: { card: Card; onPlay: (c: Card) => void; loading?: boolean }) {
  const router = useRouter();
  const href = hrefFor(card);
  const api = apiFor(card);
  const parts = card.subtitle.split(" • ");
  const kind = card.kind.charAt(0).toUpperCase() + card.kind.slice(1);
  // home feed gives "Single • Artist"; artist pages give just "2025"
  const [line2, line3] = parts.length > 1 ? [parts.slice(1).join(" • "), parts[0]] : [parts[0] ?? "", kind];
  return (
    <div className="group relative flex min-w-0 items-center gap-3.5 rounded-xl p-1.5 transition-colors hover:bg-hover" onMouseEnter={() => api && prefetch(api)}>
      <div className="relative size-[60px] shrink-0 overflow-hidden rounded-[10px] bg-raised">
        {card.thumb && (
          <img src={card.thumb} alt="" loading="lazy" className="size-full object-cover transition-transform duration-500 ease-out group-hover:scale-110" />
        )}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onPlay(card);
          }}
          aria-label={`Play ${card.title}`}
          className={`absolute inset-0 z-10 grid place-items-center bg-black/50 transition-opacity ${loading ? "opacity-100" : "opacity-0 group-hover:opacity-100 focus-visible:opacity-100"}`}
        >
          <span className="grid size-7 place-items-center rounded-full bg-green text-app">
            <svg viewBox="0 0 24 24" className="size-3 translate-x-px" fill="currentColor" aria-hidden>
              <path d="M7 4.5v15l13-7.5z" />
            </svg>
          </span>
        </button>
      </div>
      <button onClick={() => (href ? router.push(href) : onPlay(card))} className="min-w-0 text-left after:absolute after:inset-0">
        <span className="block truncate text-[14px] font-bold">{card.title}</span>
        <span className="mt-0.5 block truncate text-[12px] font-medium text-muted">{line2}</span>
        <span className="mt-0.5 block truncate text-[11.5px] text-faint">{line3}</span>
      </button>
    </div>
  );
}

export function ReleaseGrid({ title, cards, limit = 6 }: { title: string; cards: Card[]; limit?: number }) {
  const { play, loading } = usePlayCard();
  const [all, setAll] = useState(false);
  const shown = all ? cards : cards.slice(0, limit);
  return (
    <Reveal>
      <SectionHead title={title} action={cards.length > limit ? (all ? "Show less" : "Show all") : undefined} onAction={() => setAll(!all)} />
      <Stagger key={String(all)} className="-mx-1.5 grid gap-x-3 gap-y-1 sm:grid-cols-2 lg:grid-cols-3">
        {shown.map((c) => (
          <Item key={`${c.kind}-${c.id}`}>
            <ReleaseTile card={c} onPlay={play} loading={loading === c.id} />
          </Item>
        ))}
      </Stagger>
    </Reveal>
  );
}

export function Carousel({ title, cards, href }: { title: string; cards: Card[]; href?: string }) {
  const row = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { play, loading } = usePlayCard();
  const scroll = (dir: 1 | -1) => row.current?.scrollBy({ left: dir * row.current.clientWidth * 0.8, behavior: "smooth" });
  return (
    <Reveal>
      <SectionHead title={title} action={href ? "See all" : undefined} onAction={() => href && router.push(href)}>
        <button onClick={() => scroll(-1)} className="grid size-7 place-items-center rounded-lg text-faint transition-colors hover:bg-hover hover:text-ink" aria-label="Scroll left">
          <ChevronLeft className="size-4" />
        </button>
        <button onClick={() => scroll(1)} className="grid size-7 place-items-center rounded-lg text-faint transition-colors hover:bg-hover hover:text-ink" aria-label="Scroll right">
          <ChevronRight className="size-4" />
        </button>
      </SectionHead>
      <div ref={row} className="no-scrollbar -mx-2 snap-x overflow-x-auto">
        <Stagger className="flex w-max">
          {cards.map((c) => (
            <Item key={`${c.kind}-${c.id}`}>
              <MediaCard card={c} onPlay={play} loading={loading === c.id} />
            </Item>
          ))}
        </Stagger>
      </div>
    </Reveal>
  );
}

export function Grid({ cards }: { cards: Card[] }) {
  const { play, loading } = usePlayCard();
  return (
    <Stagger className="-mx-2 grid grid-cols-[repeat(auto-fill,minmax(158px,1fr))]">
      {cards.map((c) => (
        <Item key={`${c.kind}-${c.id}`}>
          <MediaCard card={c} onPlay={play} loading={loading === c.id} fluid />
        </Item>
      ))}
    </Stagger>
  );
}

