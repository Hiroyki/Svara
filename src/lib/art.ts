"use client";

import { IN_APP_DATA } from "./runtime";

const ART_HOSTS = /^https:\/\/(yt3|lh3)\.(googleusercontent|ggpht)\.com\/|^https:\/\/i9?\.ytimg\.com\//;

/** Same-origin URL for a catalogue artwork image (see app/api/img). Android has no proxy route. */
export function proxyArt(url: string): string {
  return !IN_APP_DATA && ART_HOSTS.test(url) ? `/api/img?u=${encodeURIComponent(url)}` : url;
}

/** Android: fetch artwork over Capacitor's native HTTP and hand back a data URL. */
const nativeCache = new Map<string, Promise<string>>();
function nativeArt(url: string): Promise<string> {
  let p = nativeCache.get(url);
  if (!p) {
    p = import("@capacitor/core").then(async ({ CapacitorHttp }) => {
      const res = await CapacitorHttp.get({ url, responseType: "blob" });
      if (res.status >= 400 || typeof res.data !== "string") throw new Error("art unavailable");
      const type = res.headers["Content-Type"] ?? res.headers["content-type"] ?? "image/jpeg";
      return `data:${type};base64,${res.data}`;
    });
    nativeCache.set(url, p);
  }
  return p;
}

/** Neutral artwork used when an image no longer exists anywhere (e.g. a deleted avatar). */
export const PLACEHOLDER_ART =
  "data:image/svg+xml," +
  encodeURIComponent(
    "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' fill='#262629'/>" +
      "<path d='M43 64a8 8 0 1 1-6-7.7V35l25-6v29a8 8 0 1 1-6-7.7V37.6l-13 3.1z' fill='#55555c'/></svg>",
  );

function directOf(src: string): string {
  if (!src.startsWith("/api/img")) return src;
  return new URL(src, location.origin).searchParams.get("u") ?? src;
}

/**
 * One capture-phase listener for every <img> in the app.
 * On failure it walks: CDN → our proxy → `data-fallback` → its proxy → placeholder art,
 * so a broken-image icon never shows.
 * Attempts are remembered per element *and URL*, so when React reuses an <img>
 * for a different song the new artwork gets a fresh start.
 */
export function installArtFallback(): () => void {
  const tried = new WeakMap<HTMLImageElement, Set<string>>();

  const onError = (e: Event) => {
    const img = e.target;
    if (!(img instanceof HTMLImageElement)) return;
    const src = img.getAttribute("src") ?? "";
    const seen = tried.get(img) ?? new Set<string>();
    tried.set(img, seen);
    seen.add(src);
    const fb = img.dataset.fallback;
    if (IN_APP_DATA && ART_HOSTS.test(src) && !seen.has(`native:${src}`)) {
      seen.add(`native:${src}`);
      nativeArt(src)
        .then((data) => {
          if (img.getAttribute("src") === src) img.src = data;
        })
        .catch(() => {
          if (img.getAttribute("src") === src) img.src = fb && !seen.has(fb) ? fb : PLACEHOLDER_ART;
        });
      return;
    }
    const candidates = [proxyArt(directOf(src)), fb, fb && proxyArt(fb)].filter((c): c is string => !!c);
    const next = candidates.find((c) => !seen.has(c));
    if (next) img.src = next;
    else if (src !== PLACEHOLDER_ART) img.src = PLACEHOLDER_ART;
  };

  document.addEventListener("error", onError, true);
  return () => document.removeEventListener("error", onError, true);
}
