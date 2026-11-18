"use client";

import { Clock3 } from "lucide-react";
import { EmptyState } from "@/components/Bits";
import LocalList, { GlyphArt } from "@/components/LocalList";
import { useCrumbs } from "@/components/ui";
import { usePlayer } from "@/lib/player";

export default function RecentPage() {
  useCrumbs(["My music", "Recent"]);
  const recent = usePlayer((s) => s.recent);
  return (
    <LocalList
      type="History"
      title="Recently Played"
      tracks={recent}
      art={<GlyphArt icon={Clock3} />}
      empty={<EmptyState title="Nothing played yet" text="Songs you play show up here." />}
    />
  );
}
