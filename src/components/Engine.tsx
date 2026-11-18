"use client";

import { useEffect, useRef, useState } from "react";
import { artistNames } from "@/lib/format";
import { usePlayer } from "@/lib/player";
import { toast } from "@/lib/ui";

/**
 * Playback engine. Today it drives the official YouTube IFrame Player (hidden).
 * Everything else in the app talks only to the zustand store, so the engine
 * can be swapped for a different audio source without touching the UI.
 */

type YTPlayer = {
  loadVideoById(id: string, start?: number): void;
  cueVideoById(id: string, start?: number): void;
  playVideo(): void;
  pauseVideo(): void;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  setVolume(v: number): void;
  mute(): void;
  unMute(): void;
  getCurrentTime(): number;
  getDuration(): number;
  destroy(): void;
};

type YTNamespace = {
  Player: new (
    el: HTMLElement,
    opts: {
      width: string;
      height: string;
      playerVars: Record<string, string | number>;
      events: {
        onReady: () => void;
        onStateChange: (e: { data: number }) => void;
        onError: (e: { data: number }) => void;
      };
    },
  ) => YTPlayer;
};

declare global {
  interface Window {
    YT?: YTNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let apiPromise: Promise<YTNamespace> | null = null;
function loadYouTubeApi(): Promise<YTNamespace> {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  apiPromise ??= new Promise((resolve) => {
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prev?.();
      resolve(window.YT!);
    };
    const s = document.createElement("script");
    s.src = "https://www.youtube.com/iframe_api";
    s.async = true;
    document.head.appendChild(s);
  });
  return apiPromise;
}

const ENDED = 0;
const PLAYING = 1;
const PAUSED = 2;
const BUFFERING = 3;

export default function Engine() {
  const host = useRef<HTMLDivElement>(null);
  const player = useRef<YTPlayer | null>(null);
  const loadedId = useRef<string | null>(null);
  const loggedId = useRef<string | null>(null);
  const errors = useRef(0);
  const [ready, setReady] = useState(false);

  const currentId = usePlayer((s) => s.queue[s.index]?.id);
  const playing = usePlayer((s) => s.playing);
  const volume = usePlayer((s) => s.volume);
  const muted = usePlayer((s) => s.muted);
  const seekReq = usePlayer((s) => s.seekReq);

  // boot the iframe player once
  useEffect(() => {
    let disposed = false;
    loadYouTubeApi().then((YT) => {
      if (disposed || !host.current) return;
      const el = document.createElement("div");
      host.current.appendChild(el);
      player.current = new YT.Player(el, {
        width: "200",
        height: "200",
        playerVars: {
          autoplay: 0,
          controls: 0,
          disablekb: 1,
          fs: 0,
          iv_load_policy: 3,
          playsinline: 1,
          rel: 0,
          origin: window.location.origin,
        },
        events: {
          onReady: () => setReady(true),
          onStateChange: ({ data }) => {
            const s = usePlayer.getState();
            if (data === PLAYING) {
              errors.current = 0;
              s._buffering(false);
              if (!s.playing) s._playing(true);
              const cur = s.queue[s.index];
              if (cur && loggedId.current !== cur.id) {
                loggedId.current = cur.id;
                s._recent(cur);
              }
            } else if (data === BUFFERING) {
              s._buffering(true);
            } else if (data === PAUSED) {
              s._buffering(false);
              if (s.playing && loadedId.current === s.queue[s.index]?.id) s._playing(false);
            } else if (data === ENDED) {
              s.next(true);
            }
          },
          onError: ({ data }) => {
            const s = usePlayer.getState();
            errors.current += 1;
            s._buffering(false);
            const title = s.queue[s.index]?.title ?? "This track";
            if (errors.current > 4) {
              s._playing(false);
              toast("Playback keeps failing — check your connection");
              return;
            }
            toast(data === 101 || data === 150 ? `${title} isn't available here — skipping` : `Couldn't play ${title} — skipping`);
            setTimeout(() => usePlayer.getState().next(), 700);
          },
        },
      });
    });
    return () => {
      disposed = true;
      player.current?.destroy();
      player.current = null;
    };
  }, []);

  // track changes + play/pause
  useEffect(() => {
    const p = player.current;
    if (!ready || !p) return;
    if (!currentId) {
      p.pauseVideo();
      return;
    }
    if (loadedId.current !== currentId) {
      loadedId.current = currentId;
      if (playing) p.loadVideoById(currentId);
      else p.cueVideoById(currentId);
      return;
    }
    if (playing) p.playVideo();
    else p.pauseVideo();
  }, [ready, currentId, playing]);

  useEffect(() => {
    const p = player.current;
    if (!ready || !p) return;
    p.setVolume(Math.round(volume * 100));
    if (muted) p.mute();
    else p.unMute();
  }, [ready, volume, muted]);

  useEffect(() => {
    if (!ready || !seekReq || !player.current) return;
    player.current.seekTo(seekReq.t, true);
    if (usePlayer.getState().playing) player.current.playVideo();
  }, [ready, seekReq]);

  // clock
  useEffect(() => {
    if (!ready) return;
    const id = setInterval(() => {
      const p = player.current;
      if (!p || !usePlayer.getState().playing) return;
      const t = p.getCurrentTime?.() ?? 0;
      const d = p.getDuration?.() ?? 0;
      usePlayer.getState()._time(t, d);
    }, 250);
    return () => clearInterval(id);
  }, [ready]);

  // OS media controls + tab title
  const current = usePlayer((s) => s.queue[s.index]);
  useEffect(() => {
    // short and readable in a tab: the browser already shows its own "playing" speaker icon
    const artist = current?.artists[0]?.name;
    document.title = !current ? "Svara" : playing ? `${current.title}${artist ? ` · ${artist}` : ""}` : `Paused · ${current.title}`;
  }, [current, playing]);

  useEffect(() => {
    if (!("mediaSession" in navigator) || !current) return;
    navigator.mediaSession.metadata = new MediaMetadata({
      title: current.title,
      artist: artistNames(current),
      album: current.album?.name ?? "",
      artwork: [{ src: current.thumb, sizes: "544x544", type: "image/jpeg" }],
    });
    const s = usePlayer.getState;
    const handlers: [MediaSessionAction, MediaSessionActionHandler][] = [
      ["play", () => s()._playing(true)],
      ["pause", () => s()._playing(false)],
      ["previoustrack", () => s().prev()],
      ["nexttrack", () => s().next()],
      ["seekto", (d) => d.seekTime != null && s().seek(d.seekTime)],
    ];
    for (const [a, h] of handlers) {
      try {
        navigator.mediaSession.setActionHandler(a, h);
      } catch {
        /* unsupported action */
      }
    }
  }, [current]);

  return (
    <div
      ref={host}
      aria-hidden
      className="pointer-events-none fixed bottom-0 left-0 -z-10 size-[200px] overflow-hidden opacity-0"
    />
  );
}
