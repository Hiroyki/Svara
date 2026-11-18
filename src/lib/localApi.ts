"use client";

/**
 * In-app replacement for the /api routes, used by the Android build where no
 * Svara server exists. Capacitor's native HTTP (CapacitorHttp) carries the
 * YouTube Music requests, so the browser's CORS rules don't apply.
 * The same normalisers as the server (lib/yt.ts) produce identical JSON.
 */
export async function localApi(url: string): Promise<unknown> {
  const u = new URL(url, "https://svara.local");
  const [, route, rawId] = u.pathname.split("/").filter(Boolean);
  const id = decodeURIComponent(rawId ?? "");
  const yt = await import("./yt");
  switch (route) {
    case "home":
      return yt.getHome();
    case "search": {
      const q = u.searchParams.get("q")?.trim() ?? "";
      if (!q) throw new Error("Missing q");
      return yt.search(q);
    }
    case "suggest": {
      const q = u.searchParams.get("q")?.trim() ?? "";
      return q ? yt.suggest(q) : [];
    }
    case "album":
      return yt.getAlbum(id);
    case "playlist":
      return yt.getPlaylist(id);
    case "artist":
      return yt.getArtist(id);
    case "next":
      return yt.getUpNext(id);
    case "lyrics":
      return yt.getLyrics(id);
    default:
      throw new Error(`Unknown route ${u.pathname}`);
  }
}
