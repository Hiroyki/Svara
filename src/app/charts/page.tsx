"use client";

import { BarChart3 } from "lucide-react";
import { ActionRow, ErrorState, RowsSkeleton, Skeleton } from "@/components/Bits";
import { Carousel } from "@/components/Cards";
import Hero from "@/components/Hero";
import TrackList from "@/components/TrackList";
import { SectionHead, useCrumbs } from "@/components/ui";
import { HOME_URL, useFetch } from "@/lib/fetcher";
import type { HomeData } from "@/lib/types";

export default function ChartsPage() {
  useCrumbs(["Charts", "United States"]);
  const { data, error, retry } = useFetch<HomeData>(HOME_URL);
  const trackSecs = data?.sections.filter((s) => s.tracks?.length) ?? [];
  const main = trackSecs.find((s) => /trend|chart|top/i.test(s.title)) ?? trackSecs[0];
  const others = trackSecs.filter((s) => s !== main);
  const cardSecs = data?.sections.filter((s) => s.cards?.length && !s.cards.every((c) => c.kind === "album")) ?? [];
  const lead = main?.tracks?.[0];

  if (error) return <ErrorState message={error} onRetry={retry} />;

  return (
    <div className="space-y-9">
      {lead ? (
        <Hero
          image={lead.thumb}
          position="center"
          label={
            <>
              <BarChart3 className="size-3.5" /> {main!.title} · United States
            </>
          }
          title="Top Charts"
          meta={
            <>
              #1 right now: <span className="font-bold text-white">{lead.title}</span> by {lead.artists.map((a) => a.name).join(", ")}
            </>
          }
        >
          <ActionRow tracks={main!.tracks!} />
        </Hero>
      ) : (
        <Skeleton className="h-[280px] rounded-2xl" />
      )}

      {!data && <RowsSkeleton n={10} />}

      {main && (
        <section>
          <SectionHead title={main.title} />
          <TrackList tracks={main.tracks!} header album />
        </section>
      )}
      {others.map((s) => (
        <section key={s.title}>
          <SectionHead title={s.title} />
          <TrackList tracks={s.tracks!} header album />
        </section>
      ))}
      {cardSecs.map((s) => (
        <Carousel key={s.title} title={s.title} cards={s.cards!} />
      ))}
    </div>
  );
}
