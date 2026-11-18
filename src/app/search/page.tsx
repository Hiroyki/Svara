"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { CardsSkeleton, EmptyState, ErrorState, RowsSkeleton, Skeleton } from "@/components/Bits";
import { Carousel, Grid, usePlayCard } from "@/components/Cards";
import { MoodGrid } from "@/components/Moods";
import TrackList from "@/components/TrackList";
import { PlayDisc, SectionHead, useCrumbs } from "@/components/ui";
import { HOME_URL, useFetch } from "@/lib/fetcher";
import { hrefFor } from "@/lib/format";
import { usePlayer } from "@/lib/player";
import type { Card, HomeData, SearchResult } from "@/lib/types";

const TABS = [
  { key: "all", label: "All" },
  { key: "songs", label: "Songs" },
  { key: "albums", label: "Albums" },
  { key: "artists", label: "Artists" },
  { key: "playlists", label: "Playlists" },
  { key: "videos", label: "Videos" },
] as const;
type Tab = (typeof TABS)[number]["key"];

function TopResult({ card }: { card: Card }) {
  const { play, loading } = usePlayCard();
  const href = hrefFor(card);
  const body = (
    <>
      <img src={card.thumb} alt="" className={`size-24 bg-raised object-cover ${card.kind === "artist" ? "rounded-full" : "rounded-xl"}`} />
      <p className="mt-5 truncate text-[28px] font-extrabold leading-tight tracking-[-0.03em]">{card.title}</p>
      <p className="mt-1.5 flex items-center gap-2 truncate text-[12.5px] font-medium text-muted">
        <span className="rounded-md bg-panel px-2 py-0.5 text-[11px] font-bold capitalize text-ink">{card.kind}</span>
        <span className="truncate">{card.subtitle.replace(/^(Artist|Album|Song|Video|Playlist|Single|EP)\s•\s/, "")}</span>
      </p>
    </>
  );
  return (
    <div className="group relative rounded-2xl bg-raised p-5 transition-colors hover:bg-white/[0.09]">
      {href ? (
        <Link href={href} className="block">
          {body}
        </Link>
      ) : (
        <div>{body}</div>
      )}
      <div className="absolute bottom-5 right-5 translate-y-1 opacity-0 transition-[opacity,transform] group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:opacity-100">
        <PlayDisc size="lg" loading={loading === card.id} label={`Play ${card.title}`} onClick={() => play(card)} />
      </div>
    </div>
  );
}

function Results({ q, tab }: { q: string; tab: Tab }) {
  const { data, error, retry } = useFetch<SearchResult>(`/api/search?q=${encodeURIComponent(q)}`);
  const playQueue = usePlayer((s) => s.playQueue);

  if (error) return <ErrorState message={error} onRetry={retry} />;
  if (!data) {
    return (
      <div className="space-y-9">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)]">
          <Skeleton className="h-56 rounded-2xl" />
          <RowsSkeleton n={4} />
        </div>
        <CardsSkeleton />
      </div>
    );
  }

  const total = data.songs.length + data.albums.length + data.artists.length + data.playlists.length + data.videos.length;
  if (!total) return <EmptyState title={`Nothing for “${q}”`} text="Check the spelling, or try fewer words." />;

  if (tab === "songs") return <TrackList tracks={data.songs} header album />;
  if (tab === "videos") return <TrackList tracks={data.videos} header />;
  if (tab === "albums") return <Grid cards={data.albums} />;
  if (tab === "artists") return <Grid cards={data.artists} />;
  if (tab === "playlists") return <Grid cards={data.playlists} />;

  const ql = q.toLowerCase();
  const song = data.songs[0];
  const top: Card | undefined =
    data.artists.find((a) => a.title.toLowerCase() === ql) ??
    (song
      ? { id: song.id, kind: "song", title: song.title, subtitle: song.artists.map((a) => a.name).join(", "), thumb: song.thumb, track: song }
      : (data.albums[0] ?? data.artists[0]));

  return (
    <div className="space-y-9">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)]">
        {top && (
          <section className="animate-in">
            <SectionHead title="Top result" />
            <TopResult card={top} />
          </section>
        )}
        {data.songs.length > 0 && (
          <section className="animate-in min-w-0">
            <SectionHead title="Songs" />
            <TrackList tracks={data.songs.slice(0, 4)} numbered={false} onPlayAt={(i) => playQueue(data.songs, i)} />
          </section>
        )}
      </div>
      {data.artists.length > 0 && <Carousel title="Artists" cards={data.artists} />}
      {data.albums.length > 0 && <Carousel title="Albums" cards={data.albums} />}
      {data.playlists.length > 0 && <Carousel title="Playlists" cards={data.playlists} />}
      {data.videos.length > 0 && (
        <section>
          <SectionHead title="Videos" />
          <TrackList tracks={data.videos.slice(0, 5)} numbered={false} />
        </section>
      )}
    </div>
  );
}

function Browse() {
  const { data } = useFetch<HomeData>(HOME_URL);
  const moods = data?.sections.find((s) => s.chips?.length);
  return (
    <div className="space-y-6">
      <div className="pt-2">
        <h1 className="text-[40px] font-extrabold leading-none tracking-[-0.03em]">Browse</h1>
        <p className="mt-2 text-[13px] font-medium text-muted">Moods and genres from YouTube Music. Or press / to search.</p>
      </div>
      {moods ? (
        <MoodGrid chips={moods.chips!} />
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {Array.from({ length: 12 }, (_, i) => (
            <Skeleton key={i} className="h-[76px]" />
          ))}
        </div>
      )}
    </div>
  );
}

function SearchInner() {
  const params = useSearchParams();
  const router = useRouter();
  const q = params.get("q")?.trim() ?? "";
  const tab = (TABS.some((t) => t.key === params.get("tab")) ? params.get("tab") : "all") as Tab;
  useCrumbs(q ? ["Search", q] : ["Browse"]);

  if (!q) return <Browse />;

  return (
    <div>
      <div className="no-scrollbar -mx-1 mb-7 flex gap-1.5 overflow-x-auto px-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => router.replace(`/search?q=${encodeURIComponent(q)}${t.key === "all" ? "" : `&tab=${t.key}`}`)}
            className={`relative h-8 shrink-0 rounded-full px-3.5 text-[12.5px] font-semibold transition-colors ${
              tab === t.key ? "text-app" : "bg-raised text-muted hover:text-ink"
            }`}
          >
            {tab === t.key && (
              <motion.span layoutId="search-tab" className="absolute inset-0 rounded-full bg-ink" transition={{ type: "spring", stiffness: 420, damping: 34 }} />
            )}
            <span className="relative">{t.label}</span>
          </button>
        ))}
      </div>
      <Results q={q} tab={tab} />
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<RowsSkeleton />}>
      <SearchInner />
    </Suspense>
  );
}
