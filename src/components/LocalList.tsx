"use client";

import { fmtTotal } from "@/lib/format";
import { useHydrated } from "@/lib/player";
import type { Track } from "@/lib/types";
import { ActionRow, CollectionHeader, RowsSkeleton } from "./Bits";
import TrackList from "./TrackList";

/** Collections that live in this browser: favorites, history, own playlists. */
export default function LocalList({
  type,
  title,
  tracks,
  art,
  playlistId,
  empty,
  titleSlot,
  actions,
}: {
  type: string;
  title: string;
  tracks: Track[];
  art: React.ReactNode;
  playlistId?: string;
  empty: React.ReactNode;
  titleSlot?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  const hydrated = useHydrated();
  return (
    <div className="space-y-6">
      <CollectionHeader
        type={type}
        title={title}
        art={art}
        titleSlot={titleSlot}
        meta={`${tracks.length} ${tracks.length === 1 ? "song" : "songs"}${tracks.length ? ` · ${fmtTotal(tracks)}` : ""} · saved in this browser`}
        actions={<ActionRow tracks={tracks}>{actions}</ActionRow>}
      />
      {!hydrated ? <RowsSkeleton /> : tracks.length ? <TrackList tracks={tracks} header album playlistId={playlistId} /> : empty}
    </div>
  );
}

/** Cover for collections without artwork: raised square, one glyph. */
export function GlyphArt({ icon: Icon, green }: { icon: React.ElementType; green?: boolean }) {
  return (
    <div className={`grid size-full place-items-center ${green ? "bg-green text-app" : "bg-panel text-muted"}`}>
      <Icon className="size-14" strokeWidth={1.6} fill={green ? "currentColor" : "none"} />
    </div>
  );
}
