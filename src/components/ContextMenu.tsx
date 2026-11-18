"use client";

import { Disc3, Link2, ListEnd, ListPlus, ListStart, Plus, Radio, Trash2, UserRound } from "lucide-react";
import { motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { usePlayer } from "@/lib/player";
import { toast, useUI } from "@/lib/ui";

function Item({ icon: Icon, label, onClick, danger }: { icon: typeof Plus; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-[13px] transition-colors hover:bg-hover ${
        danger ? "text-red-400" : ""
      }`}
    >
      <Icon className="size-4 shrink-0 opacity-80" />
      <span className="truncate">{label}</span>
    </button>
  );
}

export default function ContextMenu() {
  const menu = useUI((s) => s.menu);
  const close = useUI((s) => s.closeMenu);
  const playlists = usePlayer((s) => s.playlists);
  const router = useRouter();
  const box = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [sub, setSub] = useState(false);

  useLayoutEffect(() => {
    if (!menu || !box.current) return;
    const r = box.current.getBoundingClientRect();
    setPos({
      x: Math.max(8, Math.min(menu.x, window.innerWidth - r.width - 8)),
      y: Math.max(8, Math.min(menu.y, window.innerHeight - r.height - 8)),
    });
    setSub(false);
  }, [menu]);

  useEffect(() => {
    if (!menu) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    window.addEventListener("resize", close);
    document.getElementById("scroller")?.addEventListener("scroll", close, { passive: true });
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", close);
      document.getElementById("scroller")?.removeEventListener("scroll", close);
    };
  }, [menu, close]);

  if (!menu) return null;
  const { track } = menu;
  const p = usePlayer.getState;
  const run = (fn: () => void) => () => {
    fn();
    close();
  };
  const artist = track.artists.find((a) => a.id);

  return (
    <div className="fixed inset-0 z-[70]" onMouseDown={close} onContextMenu={(e) => (e.preventDefault(), close())}>
      <motion.div
        ref={box}
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 520, damping: 34 }}
        onMouseDown={(e) => e.stopPropagation()}
        style={{ left: pos.x, top: pos.y }}
        className="absolute w-64 origin-top-left rounded-2xl border border-line bg-raised p-1.5 shadow-[0_24px_48px_-12px_rgba(0,0,0,0.6)]"
      >
        <div className="flex items-center gap-3 border-b border-line px-2 pb-2.5 pt-1">
          <img src={track.thumb} alt="" className="size-10 rounded-lg object-cover" />
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold">{track.title}</div>
            <div className="truncate text-xs text-muted">{track.artists.map((a) => a.name).join(", ")}</div>
          </div>
        </div>
        <div className="pt-1.5">
          {sub ? (
            <>
              <Item
                icon={Plus}
                label="New playlist"
                onClick={run(() => {
                  const id = p().createPlaylist(`My Playlist #${playlists.length + 1}`, [track]);
                  toast("Playlist created");
                  router.push(`/library?id=${id}`);
                })}
              />
              <div className="thin-scrollbar max-h-56 overflow-y-auto">
                {playlists.map((pl) => (
                  <Item key={pl.id} icon={ListPlus} label={pl.name} onClick={run(() => p().addToPlaylist(pl.id, track))} />
                ))}
              </div>
            </>
          ) : (
            <>
              <Item icon={ListStart} label="Play next" onClick={run(() => p().playNext(track))} />
              <Item icon={ListEnd} label="Add to queue" onClick={run(() => p().addToQueue(track))} />
              <Item icon={Radio} label="Start song radio" onClick={run(() => p().playTrack(track))} />
              <Item icon={ListPlus} label="Add to playlist…" onClick={() => setSub(true)} />
              {menu.playlistId && (
                <Item
                  icon={Trash2}
                  danger
                  label="Remove from this playlist"
                  onClick={run(() => p().removeFromPlaylist(menu.playlistId!, track.id))}
                />
              )}
              <div className="my-1.5 h-px bg-line" />
              {track.album?.id && <Item icon={Disc3} label="Go to album" onClick={run(() => router.push(`/album?id=${track.album!.id}`))} />}
              {artist && <Item icon={UserRound} label="Go to artist" onClick={run(() => router.push(`/artist?id=${artist.id}`))} />}
              <Item
                icon={Link2}
                label="Copy song link"
                onClick={run(() => {
                  void navigator.clipboard?.writeText(`https://music.youtube.com/watch?v=${track.id}`);
                  toast("Link copied");
                })}
              />
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
