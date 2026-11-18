"use client";

import { useFetch } from "@/lib/fetcher";
import { fmtTotal } from "@/lib/format";
import type { Collection } from "@/lib/types";
import { ActionRow, ArtistLinks, CollectionHeader, ErrorState, RowsSkeleton, Skeleton } from "./Bits";
import TrackList from "./TrackList";
import { useCrumbs } from "./ui";

export default function CollectionView({ kind, id }: { kind: "album" | "playlist"; id: string }) {
  const { data, error, retry } = useFetch<Collection>(`/api/${kind}/${id}`);
  const isAlbum = kind === "album";
  useCrumbs([isAlbum ? "Albums" : "Playlists", data?.title ?? ""]);

  if (error) return <ErrorState message={error} onRetry={retry} />;
  if (!data) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-[226px] rounded-2xl" />
        <RowsSkeleton n={8} />
      </div>
    );
  }

  const type = data.subtitle.split(" • ")[0] || (isAlbum ? "Album" : "Playlist");
  const rest = data.subtitle.split(" • ").slice(1).join(" · ");
  const counts = (data.meta || `${data.tracks.length} songs • ${fmtTotal(data.tracks)}`).replaceAll(" • ", " · ");

  return (
    <div className="space-y-6">
      <CollectionHeader
        type={type}
        title={data.title}
        thumb={data.thumb}
        meta={
          <>
            {data.artists.length > 0 && (
              <>
                <ArtistLinks artists={data.artists} />
                <span className="mx-1.5 text-white/40">·</span>
              </>
            )}
            {[rest, counts].filter(Boolean).join(" · ")}
          </>
        }
        actions={<ActionRow tracks={data.tracks} />}
      />
      {data.description && <p className="line-clamp-3 max-w-3xl text-[13px] font-medium leading-relaxed text-muted">{data.description}</p>}
      <TrackList tracks={data.tracks} header art={!isAlbum} album={!isAlbum} />
    </div>
  );
}
