"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { artistNames } from "@/lib/format";
import { isNativeApp, SvaraMedia } from "@/lib/native";
import { usePlayer } from "@/lib/player";
import { useUI } from "@/lib/ui";

/**
 * Android only. Mirrors the player into the native media notification
 * (lock screen, headset, Bluetooth) and handles the system back button.
 * Renders nothing; the web and desktop builds never mount it.
 */
export default function NativeBridge() {
  useMediaNotification();
  useBackButton();
  return null;
}

function useMediaNotification() {
  useEffect(() => {
    if (!isNativeApp()) return;

    let last = "";
    const push = () => {
      const s = usePlayer.getState();
      const t = s.queue[s.index];
      if (!t) {
        if (last) void SvaraMedia.stop();
        last = "";
        return;
      }
      const duration = s.duration || t.duration || 0;
      // only what the notification shows; position is extrapolated natively between updates
      const key = `${t.id}|${s.playing}|${Math.round(duration)}|${s.seekReq?.n ?? 0}`;
      if (key === last) return;
      last = key;
      void SvaraMedia.update({
        title: t.title,
        artist: artistNames(t),
        album: t.album?.name ?? "",
        artwork: t.thumb,
        playing: s.playing,
        position: s.position,
        duration,
      });
    };

    const unsub = usePlayer.subscribe(push);
    push();

    const handle = SvaraMedia.addListener("action", ({ action, position }) => {
      const s = usePlayer.getState();
      if (action === "play") s._playing(true);
      else if (action === "pause") s._playing(false);
      else if (action === "next") s.next();
      else if (action === "prev") s.prev();
      else if (action === "seek" && position != null) s.seek(position);
    });

    return () => {
      unsub();
      void handle.then((h) => h.remove());
    };
  }, []);
}

/** Back closes the topmost overlay, then walks back through pages, then leaves the app playing. */
function useBackButton() {
  const router = useRouter();
  const pathname = usePathname();
  const routeKey = `${pathname}?${useSearchParams().toString()}`;
  const depth = useRef(-1); // first render brings it to 0
  const popped = useRef(false);
  const replaced = useRef(false);

  useEffect(() => {
    if (popped.current || replaced.current) {
      if (popped.current) depth.current = Math.max(0, depth.current - 1);
      popped.current = replaced.current = false;
    } else {
      depth.current += 1;
    }
  }, [routeKey]);

  const state = useRef({ pathname, router });
  useEffect(() => {
    state.current = { pathname, router };
  }, [pathname, router]);

  useEffect(() => {
    if (!isNativeApp()) return;
    const onPop = () => (popped.current = true);
    window.addEventListener("popstate", onPop);

    const handle = SvaraMedia.addListener("back", () => {
      const ui = useUI.getState();
      const player = usePlayer.getState();
      if (ui.menu) ui.closeMenu();
      else if (ui.help) ui.setHelp(false);
      else if (player.nowPlaying) player.openNowPlaying(false);
      else if (depth.current > 0) window.history.back();
      else if (state.current.pathname !== "/") {
        replaced.current = true;
        state.current.router.replace("/");
      } else void SvaraMedia.minimize();
    });

    return () => {
      window.removeEventListener("popstate", onPop);
      void handle.then((h) => h.remove());
    };
  }, []);
}
