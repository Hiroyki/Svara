"use client";

import { TrendingUp } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ErrorState, RowsSkeleton, Skeleton } from "@/components/Bits";
import { Carousel, ReleaseGrid } from "@/components/Cards";
import Hero from "@/components/Hero";
import { Item, Reveal, Stagger } from "@/components/motion";
import TrackList from "@/components/TrackList";
import { PlayDisc, SectionHead, useCrumbs } from "@/components/ui";
import { HOME_URL, prefetch, useFetch } from "@/lib/fetcher";
import { useCurrent, usePlayer } from "@/lib/player";
import type { ArtistPage, Card, Chip, HomeData, Section, Track } from "@/lib/types";

const mostly = (s: Section, kind: Card["kind"]) => {
  const c = s.cards ?? [];
  return c.length > 0 && c.filter((x) => x.kind === kind).length / c.length >= 0.6;
};

type Pick = { track: Track; artistId: string; artistName: string; rank: number };

const SLIDE_MS = 7000;

/** One slide: the artist behind a top chart song. Shows the song art until the artist page arrives. */
function FeaturedSlide({ pick }: { pick: Pick }) {
  const { data } = useFetch<ArtistPage>(`/api/artist/${pick.artistId}`);
  const playQueue = usePlayer((s) => s.playQueue);
  const playTrack = usePlayer((s) => s.playTrack);
  const toggle = usePlayer((s) => s.toggle);
  const current = useCurrent();
  const playing = usePlayer((s) => s.playing);
  const songs = data?.topSongs ?? [];
  const isThis = !!current && (current.id === pick.track.id || songs.some((t) => t.id === current.id));

  return (
    <Hero
      className="h-full"
      image={data ? data.banner || data.thumb : pick.track.thumb}
      fallback={data?.thumb ?? pick.track.thumb}
      label={
        <>
          <span className="grid size-4 place-items-center rounded-full bg-green text-app">
            <TrendingUp className="size-2.5" strokeWidth={3} />
          </span>
          #{pick.rank} on Top Charts today
        </>
      }
      title={data?.name ?? pick.artistName}
      meta={
        <>
          {data?.audience && <span>{data.audience}</span>}
          {data?.audience && <span className="text-white/40">·</span>}
          <span className="truncate">“{pick.track.title}”</span>
        </>
      }
    >
      <div className="absolute bottom-6 right-6 flex items-center gap-3 sm:bottom-8 sm:right-8">
        <Link
          href={`/artist?id=${pick.artistId}`}
          className="hidden rounded-full bg-white/15 px-4 py-2 text-[12.5px] font-semibold text-white backdrop-blur-sm transition-colors hover:bg-white/25 sm:block"
        >
          View artist
        </Link>
        <PlayDisc
          size="lg"
          playing={isThis && playing}
          onClick={() => (isThis ? toggle() : songs.length ? playQueue(songs, 0, { shuffle: false }) : playTrack(pick.track))}
        />
      </div>
    </Hero>
  );
}

/** Hero carousel: the five top-charting artists, one every 7s. Hover pauses; segments jump. */
function FeaturedCarousel({ tracks }: { tracks: Track[] }) {
  const reduce = useReducedMotion();
  const picks = useMemo(() => {
    const seen = new Set<string>();
    const out: Pick[] = [];
    tracks.forEach((t, i) => {
      const a = t.artists.find((x) => x.id);
      if (a?.id && !seen.has(a.id) && out.length < 5) {
        seen.add(a.id);
        out.push({ track: t, artistId: a.id, artistName: a.name, rank: i + 1 });
      }
    });
    return out;
  }, [tracks]);
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const next = (idx + 1) % Math.max(1, picks.length);

  useEffect(() => {
    if (picks[next]) prefetch(`/api/artist/${picks[next].artistId}`);
  }, [next, picks]);

  if (!picks.length) return null;
  const pick = picks[idx];

  return (
    <div className="relative h-[280px] sm:h-[320px]" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      <AnimatePresence initial={false}>
        <motion.div
          key={pick.artistId}
          className="absolute inset-0"
          initial={{ opacity: 0, scale: 0.985 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.7 }}
        >
          <FeaturedSlide pick={pick} />
        </motion.div>
      </AnimatePresence>

      {picks.length > 1 && (
        <div className="absolute left-6 right-6 top-6 z-10 flex gap-1.5 sm:left-8 sm:right-auto sm:top-7">
          {picks.map((p, i) => (
            <button
              key={p.artistId}
              onClick={() => setIdx(i)}
              aria-label={`Show ${p.artistName}`}
              className="group relative h-6 flex-1 sm:w-10 sm:flex-none"
            >
              <span className="absolute inset-x-0 top-1/2 block h-[3px] -translate-y-1/2 overflow-hidden rounded-full bg-white/25 transition-colors group-hover:bg-white/40">
                {i < idx && <span className="block size-full bg-white" />}
                {i === idx &&
                  (reduce ? (
                    <span className="block size-full bg-white" />
                  ) : (
                    <span
                      key={idx}
                      className="grow-bar block size-full bg-white"
                      style={{ "--grow-dur": `${SLIDE_MS}ms`, animationPlayState: paused ? "paused" : "running" } as React.CSSProperties}
                      onAnimationEnd={() => setIdx(next)}
                    />
                  ))}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function MoodChips({ chips }: { chips: Chip[] }) {
  return (
    <motion.div
      className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1"
      initial="hidden"
      animate="show"
      variants={{ hidden: {}, show: { transition: { staggerChildren: 0.025, delayChildren: 0.2 } } }}
    >
      {chips.map((c) => (
        <motion.div key={c.label} variants={{ hidden: { opacity: 0, x: 14 }, show: { opacity: 1, x: 0 } }}>
          <Link
            href={`/search?q=${encodeURIComponent(c.label + " playlist")}&tab=playlists`}
            className="flex h-8 shrink-0 items-center whitespace-nowrap rounded-full bg-raised px-3.5 text-[12.5px] font-semibold text-muted transition-colors hover:bg-green hover:text-app"
          >
            {c.label}
          </Link>
        </motion.div>
      ))}
    </motion.div>
  );
}

/** Ranked artist list beside the chart table. */
function TopArtists({ title, cards }: { title: string; cards: Card[] }) {
  return (
    <Reveal className="min-w-0">
      <SectionHead title={title} />
      <Stagger className="space-y-0.5">
        {cards.slice(0, 8).map((a, i) => (
          <Item key={a.id}>
            <Link href={`/artist?id=${a.id}`} onMouseEnter={() => prefetch(`/api/artist/${a.id}`)} className="group flex h-12 items-center gap-3 rounded-xl px-2 transition-colors hover:bg-hover">
              <span className={`w-5 text-center text-[13px] font-extrabold tabular-nums ${i < 3 ? "text-green" : "text-faint"}`}>{i + 1}</span>
              <img src={a.thumb} alt="" loading="lazy" className="size-9 shrink-0 rounded-full bg-raised object-cover transition-transform duration-300 group-hover:scale-110" />
              <span className="min-w-0">
                <span className="block truncate text-[13.5px] font-semibold">{a.title}</span>
                <span className="block truncate text-[12px] font-medium text-muted">{a.subtitle}</span>
              </span>
            </Link>
          </Item>
        ))}
      </Stagger>
    </Reveal>
  );
}

function Loading() {
  return (
    <div className="space-y-8">
      <Skeleton className="h-[320px] rounded-2xl" />
      <div className="flex gap-2">
        {Array.from({ length: 9 }, (_, i) => (
          <Skeleton key={i} className="h-8 w-20 rounded-full" />
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="flex items-center gap-3.5 p-1.5">
            <Skeleton className="size-[60px] rounded-[10px]" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-2.5 w-3/4 rounded-full" />
              <Skeleton className="h-2 w-1/2 rounded-full" />
            </div>
          </div>
        ))}
      </div>
      <RowsSkeleton n={5} />
    </div>
  );
}

export default function ExplorePage() {
  useCrumbs(["Explore", "Today"]);
  const router = useRouter();
  const { data, error, retry } = useFetch<HomeData>(HOME_URL);
  const recent = usePlayer((s) => s.recent);
  const playQueue = usePlayer((s) => s.playQueue);

  if (error) return <ErrorState message={error} onRetry={retry} />;
  if (!data) return <Loading />;

  const sections = data.sections;
  const moods = sections.find((s) => s.chips?.length);
  const albums = sections.find((s) => mostly(s, "album"));
  const playlists = sections.find((s) => mostly(s, "playlist"));
  const artists = sections.find((s) => mostly(s, "artist"));
  const trackSecs = sections.filter((s) => s.tracks?.length);
  const charts = trackSecs.find((s) => /trend|chart|top/i.test(s.title)) ?? trackSecs[0];
  const quick = trackSecs.find((s) => s !== charts);
  const rest = sections.filter((s) => s.cards?.length && s !== albums && s !== playlists && s !== artists);

  return (
    <div className="space-y-9">
      {charts && <FeaturedCarousel tracks={charts.tracks!} />}

      {moods && <MoodChips chips={moods.chips!} />}

      {albums && <ReleaseGrid title="New releases" cards={albums.cards!} />}

      <div className="grid gap-9 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        {charts && (
          <Reveal className="min-w-0">
            <SectionHead title="Top Charts" action="See all" onAction={() => router.push("/charts")} />
            <TrackList tracks={charts.tracks!.slice(0, 8)} header album />
          </Reveal>
        )}
        {artists && <TopArtists title="Top artists" cards={artists.cards!} />}
      </div>

      {playlists && <Carousel title={playlists.title} cards={playlists.cards!} />}

      {quick && (
        <Reveal>
          <SectionHead title={quick.title} />
          <div className="grid gap-x-6 lg:grid-cols-2">
            {[quick.tracks!.slice(0, 5), quick.tracks!.slice(5, 10)].map((col, c) => (
              <TrackList key={c} tracks={col} numbered={false} onPlayAt={(i) => playQueue(quick.tracks!, c * 5 + i)} />
            ))}
          </div>
        </Reveal>
      )}

      {recent.length > 0 && (
        <Carousel
          title="Jump back in"
          href="/recent"
          cards={recent.slice(0, 16).map((t) => ({
            id: t.id,
            kind: "song" as const,
            title: t.title,
            subtitle: t.artists.map((a) => a.name).join(", "),
            thumb: t.thumb,
            track: t,
          }))}
        />
      )}

      {rest.map((s) => (
        <Carousel key={s.title} title={s.title} cards={s.cards!} />
      ))}
    </div>
  );
}
