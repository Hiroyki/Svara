"use client";

import { ListMusic, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { EmptyState } from "@/components/Bits";
import { useCrumbs } from "@/components/ui";
import LocalList, { GlyphArt } from "@/components/LocalList";
import { useHydrated, usePlayer } from "@/lib/player";
import { toast } from "@/lib/ui";

export default function LocalPlaylistPage() {
  const id = useSearchParams().get("id") ?? "";
  const router = useRouter();
  const hydrated = useHydrated();
  const playlist = usePlayer((s) => s.playlists.find((p) => p.id === id));
  const rename = usePlayer((s) => s.renamePlaylist);
  const remove = usePlayer((s) => s.deletePlaylist);
  const [editing, setEditing] = useState(false);
  const [confirm, setConfirm] = useState(false);
  useCrumbs(["Playlists", playlist?.name ?? ""]);

  if (hydrated && !playlist) {
    return <EmptyState title="Playlist not found" text="It was deleted, or made in a different browser." />;
  }

  const name = playlist?.name ?? "";
  const art = playlist?.tracks.slice(0, 4) ?? [];

  return (
    <LocalList
      type="Playlist"
      title={editing ? "" : name}
      tracks={playlist?.tracks ?? []}
      playlistId={id}
      art={
        art.length >= 4 ? (
          <div className="grid size-full grid-cols-2">
            {art.map((t) => (
              <img key={t.id} src={t.thumb} alt="" className="size-full object-cover" />
            ))}
          </div>
        ) : art[0] ? (
          <img src={art[0].thumb} alt="" className="size-full object-cover" />
        ) : (
          <GlyphArt icon={ListMusic} />
        )
      }
      titleSlot={
        editing ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const v = new FormData(e.currentTarget).get("name");
              rename(id, String(v ?? ""));
              setEditing(false);
            }}
          >
            <input
              name="name"
              defaultValue={name}
              autoFocus
              onBlur={(e) => {
                rename(id, e.target.value);
                setEditing(false);
              }}
              aria-label="Playlist name"
              className="mt-1 w-full max-w-xl rounded-lg border border-green/60 bg-black/30 px-2.5 py-0.5 text-4xl font-extrabold tracking-[-0.03em] outline-none sm:text-5xl"
            />
          </form>
        ) : null
      }
      actions={
        <>
          <button
            onClick={() => setEditing(true)}
            className="ml-1 grid size-10 place-items-center rounded-[10px] text-white/80 transition-colors hover:bg-white/10 hover:text-white"
            aria-label="Rename playlist"
            title="Rename"
          >
            <Pencil className="size-[17px]" />
          </button>
          <button
            onClick={() => {
              if (!confirm) {
                setConfirm(true);
                setTimeout(() => setConfirm(false), 3000);
                return;
              }
              remove(id);
              toast(`Deleted ${name}`);
              router.push("/");
            }}
            className={`flex h-10 items-center gap-2 rounded-[10px] px-2.5 text-[12.5px] font-semibold transition-colors ${confirm ? "bg-red-500/15 text-red-400" : "text-white/80 hover:bg-white/10 hover:text-white"}`}
            aria-label="Delete playlist"
          >
            <Trash2 className="size-[17px]" /> {confirm ? "Click again to delete" : ""}
          </button>
        </>
      }
      empty={
        <EmptyState title="Empty playlist" text="Hit + on any song and choose “Add to playlist”.">
          <Link href="/search" className="mt-5 inline-block rounded-full bg-raised px-5 py-2 text-[13px] font-semibold hover:bg-white/10">
            Find songs
          </Link>
        </EmptyState>
      }
    />
  );
}
