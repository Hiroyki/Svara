"use client";

import { Radio, Users } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { ActionRow, ErrorState, RowsSkeleton, Skeleton } from "@/components/Bits";
import { Carousel, ReleaseGrid } from "@/components/Cards";
import Hero from "@/components/Hero";
import TrackList from "@/components/TrackList";
import { SectionHead, useCrumbs } from "@/components/ui";
import { useFetch } from "@/lib/fetcher";
import { usePlayer } from "@/lib/player";
import type { ArtistPage } from "@/lib/types";

export default function ArtistView() {
  const id = useSearchParams().get("id") ?? "";
  const { data, error, retry } = useFetch<ArtistPage>(`/api/artist/${id}`);
  const playTrack = usePlayer((s) => s.playTrack);
  const [more, setMore] = useState(false);
  useCrumbs(["Artists", data?.name ?? ""]);

  if (error) return <ErrorState message={error} onRetry={retry} />;
  if (!data) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-[280px] rounded-2xl" />
        <RowsSkeleton n={5} />
      </div>
    );
  }

  const releases = data.sections.find((s) => s.cards?.some((c) => c.kind === "album"));
  const others = data.sections.filter((s) => s !== releases);

  return (
    <div className="space-y-9">
      <Hero
        image={data.banner || data.thumb}
        fallback={data.thumb}
        label="Artist"
        title={data.name}
        meta={
          data.audience ? (
            <>
              <Users className="size-3.5" /> {data.audience.replace(/monthly audience/i, "listeners this month")}
            </>
          ) : undefined
        }
      >
        <ActionRow tracks={data.topSongs}>
          <button
            disabled={!data.topSongs.length}
            onClick={() => playTrack(data.topSongs[0])}
            className="ml-1 flex h-9 items-center gap-2 rounded-full bg-white/15 px-4 text-[12.5px] font-semibold text-white backdrop-blur-sm transition-colors hover:bg-white/25 disabled:opacity-40"
          >
            <Radio className="size-3.5" /> Radio
          </button>
        </ActionRow>
      </Hero>

      {releases && <ReleaseGrid title={releases.title} cards={releases.cards!} />}

      {data.topSongs.length > 0 && (
        <section className="animate-in">
          <SectionHead title="Popular" />
          <TrackList tracks={data.topSongs} header album />
        </section>
      )}

      {others.map((s) =>
        s.cards?.length ? (
          <Carousel key={s.title} title={s.title} cards={s.cards} />
        ) : s.tracks?.length ? (
          <section key={s.title}>
            <SectionHead title={s.title} />
            <TrackList tracks={s.tracks} />
          </section>
        ) : null,
      )}

      {data.description && (
        <section className="max-w-2xl">
          <SectionHead title="About" />
          <p className={`whitespace-pre-line text-[13.5px] font-medium leading-relaxed text-muted ${more ? "" : "line-clamp-4"}`}>{data.description}</p>
          <button onClick={() => setMore(!more)} className="mt-2 text-[12.5px] font-bold text-ink hover:text-green">
            {more ? "Show less" : "Read more"}
          </button>
        </section>
      )}
    </div>
  );
}
