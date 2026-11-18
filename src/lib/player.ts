"use client";

import { useSyncExternalStore } from "react";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { getCached } from "./fetcher";
import { shuffleArray } from "./format";
import type { Track } from "./types";
import { toast } from "./ui";

export type Repeat = "off" | "all" | "one";
export type LocalPlaylist = { id: string; name: string; tracks: Track[]; createdAt: number };

type State = {
  queue: Track[];
  index: number;
  playing: boolean;
  buffering: boolean;
  position: number;
  duration: number;
  volume: number;
  muted: boolean;
  shuffle: boolean;
  repeat: Repeat;
  autoplay: boolean;
  seekReq: { t: number; n: number } | null;
  extending: boolean;

  liked: Track[];
  recent: Track[];
  playlists: LocalPlaylist[];

  nowPlaying: boolean;
  panel: "lyrics" | "queue";
};

type Actions = {
  playQueue: (tracks: Track[], start?: number, opts?: { shuffle?: boolean }) => void;
  playTrack: (track: Track) => void;
  toggle: () => void;
  next: (auto?: boolean) => void;
  prev: () => void;
  seek: (t: number) => void;
  setVolume: (v: number) => void;
  toggleMute: () => void;
  toggleShuffle: () => void;
  cycleRepeat: () => void;
  toggleAutoplay: () => void;
  addToQueue: (t: Track) => void;
  playNext: (t: Track) => void;
  removeAt: (i: number) => void;
  jumpTo: (i: number) => void;
  clearUpcoming: () => void;
  /** Replace the first `reordered.length` upcoming tracks with a new order. */
  reorderUpcoming: (reordered: Track[]) => void;
  extendRadio: (advance: boolean) => Promise<void>;

  toggleLike: (t: Track) => void;
  createPlaylist: (name: string, tracks?: Track[]) => string;
  addToPlaylist: (pid: string, t: Track) => void;
  removeFromPlaylist: (pid: string, trackId: string) => void;
  renamePlaylist: (pid: string, name: string) => void;
  deletePlaylist: (pid: string) => void;

  openNowPlaying: (open: boolean, panel?: State["panel"]) => void;

  _time: (position: number, duration: number) => void;
  _playing: (playing: boolean) => void;
  _buffering: (b: boolean) => void;
  _recent: (t: Track) => void;
};

const uid = () => Math.random().toString(36).slice(2, 10);

export const usePlayer = create<State & Actions>()(
  persist(
    (set, get) => ({
      queue: [],
      index: 0,
      playing: false,
      buffering: false,
      position: 0,
      duration: 0,
      volume: 0.8,
      muted: false,
      shuffle: false,
      repeat: "off",
      autoplay: true,
      seekReq: null,
      extending: false,
      liked: [],
      recent: [],
      playlists: [],
      nowPlaying: false,
      panel: "lyrics",

      playQueue: (tracks, start = 0, opts) => {
        if (!tracks.length) return;
        let queue = tracks;
        let index = Math.max(0, Math.min(start, tracks.length - 1));
        const shuffle = opts?.shuffle ?? get().shuffle;
        if (shuffle) {
          const first = tracks[opts?.shuffle ? Math.floor(Math.random() * tracks.length) : index];
          queue = [first, ...shuffleArray(tracks.filter((t) => t !== first))];
          index = 0;
        }
        set({ queue, index, playing: true, position: 0, duration: queue[index].duration ?? 0, shuffle });
      },

      playTrack: (track) => {
        set({ queue: [track], index: 0, playing: true, position: 0, duration: track.duration ?? 0 });
        void get().extendRadio(false);
      },

      toggle: () => {
        if (!get().queue.length) return;
        set({ playing: !get().playing });
      },

      next: (auto = false) => {
        const s = get();
        if (!s.queue.length) return;
        if (auto && s.repeat === "one") {
          set({ seekReq: { t: 0, n: Date.now() }, playing: true });
          return;
        }
        let i = s.index + 1;
        if (i >= s.queue.length) {
          if (s.repeat === "all") i = 0;
          else if (s.autoplay) {
            void s.extendRadio(true);
            return;
          } else {
            set({ playing: false, seekReq: { t: 0, n: Date.now() } });
            return;
          }
        }
        set({ index: i, playing: true, position: 0, duration: s.queue[i].duration ?? 0 });
        if (s.autoplay && s.repeat === "off" && s.queue.length - i <= 2) void s.extendRadio(false);
      },

      prev: () => {
        const s = get();
        if (!s.queue.length) return;
        if (s.position > 3 || s.index === 0) {
          set({ seekReq: { t: 0, n: Date.now() }, position: 0 });
          return;
        }
        const i = s.index - 1;
        set({ index: i, playing: true, position: 0, duration: s.queue[i].duration ?? 0 });
      },

      seek: (t) => set({ seekReq: { t, n: Date.now() }, position: t }),
      setVolume: (v) => set({ volume: Math.max(0, Math.min(1, v)), muted: v <= 0 }),
      toggleMute: () => set({ muted: !get().muted }),

      toggleShuffle: () => {
        const s = get();
        const shuffle = !s.shuffle;
        if (shuffle && s.queue.length > s.index + 2) {
          const head = s.queue.slice(0, s.index + 1);
          const rest = shuffleArray(s.queue.slice(s.index + 1));
          set({ shuffle, queue: [...head, ...rest] });
        } else set({ shuffle });
        toast(shuffle ? "Shuffle on" : "Shuffle off");
      },

      cycleRepeat: () => {
        const order: Repeat[] = ["off", "all", "one"];
        const repeat = order[(order.indexOf(get().repeat) + 1) % order.length];
        set({ repeat });
        toast(repeat === "off" ? "Repeat off" : repeat === "all" ? "Repeat queue" : "Repeat this song");
      },

      toggleAutoplay: () => {
        const autoplay = !get().autoplay;
        set({ autoplay });
        toast(autoplay ? "Autoplay radio on" : "Autoplay radio off");
      },

      addToQueue: (t) => {
        const s = get();
        if (!s.queue.length) return s.playQueue([t]);
        set({ queue: [...s.queue, t] });
        toast(`Added to queue · ${t.title}`);
      },

      playNext: (t) => {
        const s = get();
        if (!s.queue.length) return s.playQueue([t]);
        const q = [...s.queue];
        q.splice(s.index + 1, 0, t);
        set({ queue: q });
        toast(`Playing next · ${t.title}`);
      },

      removeAt: (i) => {
        const s = get();
        if (i === s.index) return;
        const q = s.queue.filter((_, n) => n !== i);
        set({ queue: q, index: i < s.index ? s.index - 1 : s.index });
      },

      jumpTo: (i) => {
        const s = get();
        if (!s.queue[i]) return;
        set({ index: i, playing: true, position: 0, duration: s.queue[i].duration ?? 0 });
      },

      clearUpcoming: () => {
        const s = get();
        set({ queue: s.queue.slice(0, s.index + 1) });
      },

      reorderUpcoming: (reordered) => {
        const s = get();
        const head = s.queue.slice(0, s.index + 1);
        const tail = s.queue.slice(s.index + 1 + reordered.length);
        set({ queue: [...head, ...reordered, ...tail] });
      },

      extendRadio: async (advance) => {
        const s = get();
        const seed = s.queue[s.queue.length - 1];
        if (!seed || s.extending) return;
        set({ extending: true });
        try {
          const more = await getCached<Track[]>(`/api/next/${seed.id}`);
          const seen = new Set(get().queue.map((t) => t.id));
          const fresh = more.filter((t) => !seen.has(t.id)).slice(0, 25);
          if (!fresh.length) {
            if (advance) set({ playing: false });
            return;
          }
          const queue = [...get().queue, ...fresh];
          if (advance) {
            const i = get().index + 1;
            set({ queue, index: i, playing: true, position: 0, duration: queue[i].duration ?? 0 });
          } else set({ queue });
        } catch {
          if (advance) {
            set({ playing: false });
            toast("Couldn't load more songs");
          }
        } finally {
          set({ extending: false });
        }
      },

      toggleLike: (t) => {
        const liked = get().liked;
        const has = liked.some((x) => x.id === t.id);
        set({ liked: has ? liked.filter((x) => x.id !== t.id) : [t, ...liked] });
        toast(has ? "Removed from Favorite Songs" : "Added to Favorite Songs");
      },

      createPlaylist: (name, tracks = []) => {
        const id = uid();
        set({ playlists: [...get().playlists, { id, name: name.trim() || "My Playlist", tracks, createdAt: Date.now() }] });
        return id;
      },

      addToPlaylist: (pid, t) => {
        let name = "";
        set({
          playlists: get().playlists.map((p) => {
            if (p.id !== pid) return p;
            name = p.name;
            return p.tracks.some((x) => x.id === t.id) ? p : { ...p, tracks: [...p.tracks, t] };
          }),
        });
        toast(`Added to ${name}`);
      },

      removeFromPlaylist: (pid, trackId) =>
        set({
          playlists: get().playlists.map((p) =>
            p.id === pid ? { ...p, tracks: p.tracks.filter((t) => t.id !== trackId) } : p,
          ),
        }),

      renamePlaylist: (pid, name) =>
        set({ playlists: get().playlists.map((p) => (p.id === pid ? { ...p, name: name.trim() || p.name } : p)) }),

      deletePlaylist: (pid) => set({ playlists: get().playlists.filter((p) => p.id !== pid) }),

      openNowPlaying: (open, panel) => set({ nowPlaying: open, ...(panel ? { panel } : {}) }),

      _time: (position, duration) => set({ position, duration: duration || get().duration }),
      _playing: (playing) => set({ playing }),
      _buffering: (buffering) => set({ buffering }),
      _recent: (t) => set({ recent: [t, ...get().recent.filter((x) => x.id !== t.id)].slice(0, 60) }),
    }),
    {
      name: "svara-player",
      version: 1,
      skipHydration: true,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        queue: s.queue.slice(0, 300),
        index: s.index,
        volume: s.volume,
        muted: s.muted,
        shuffle: s.shuffle,
        repeat: s.repeat,
        autoplay: s.autoplay,
        liked: s.liked,
        recent: s.recent,
        playlists: s.playlists,
      }),
    },
  ),
);

export const useCurrent = () => usePlayer((s) => s.queue[s.index] as Track | undefined);
export const useIsLiked = (id?: string) => usePlayer((s) => !!id && s.liked.some((t) => t.id === id));

/** True once liked songs / playlists have been restored from this browser. */
export function useHydrated() {
  return useSyncExternalStore(
    (cb) => usePlayer.persist.onFinishHydration(cb),
    () => usePlayer.persist.hasHydrated(),
    () => false,
  );
}
