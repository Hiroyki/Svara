import type { NextRequest } from "next/server";

/**
 * Artwork proxy. Browsers sometimes get YouTube's image CDN responses blocked
 * (ERR_BLOCKED_BY_ORB under bursts of requests); the server fetches them fine.
 * Only YouTube/Google image hosts are allowed, so this can't be used as an open proxy.
 */
const ALLOWED = new Set([
  "yt3.googleusercontent.com",
  "lh3.googleusercontent.com",
  "yt3.ggpht.com",
  "lh3.ggpht.com",
  "i.ytimg.com",
  "i9.ytimg.com",
]);

type Entry = { body: ArrayBuffer; type: string };
const g = globalThis as unknown as { __svaraArt?: Map<string, Entry>; __svaraArtBytes?: number };
const cache = (g.__svaraArt ??= new Map());
const MAX_BYTES = 96 * 1024 * 1024;

// keep upstream concurrency low so the CDN never sees a burst from us
let active = 0;
const waiting: (() => void)[] = [];
async function slot<T>(fn: () => Promise<T>): Promise<T> {
  if (active >= 6) await new Promise<void>((r) => waiting.push(r));
  active++;
  try {
    return await fn();
  } finally {
    active--;
    waiting.shift()?.();
  }
}

async function fetchArt(url: string): Promise<Entry> {
  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await slot(() => fetch(url, { signal: AbortSignal.timeout(10_000) }));
    const type = res.headers.get("content-type") ?? "";
    if (res.ok && type.startsWith("image/")) return { body: await res.arrayBuffer(), type };
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error("upstream refused");
}

export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("u") ?? "";
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return new Response("bad url", { status: 400 });
  }
  if (url.protocol !== "https:" || !ALLOWED.has(url.hostname)) return new Response("host not allowed", { status: 400 });

  const key = url.toString();
  let hit = cache.get(key);
  if (!hit) {
    try {
      hit = await fetchArt(key);
    } catch {
      return new Response("unavailable", { status: 502 });
    }
    cache.set(key, hit);
    g.__svaraArtBytes = (g.__svaraArtBytes ?? 0) + hit.body.byteLength;
    while ((g.__svaraArtBytes ?? 0) > MAX_BYTES && cache.size) {
      const oldest = cache.keys().next().value!;
      g.__svaraArtBytes! -= cache.get(oldest)!.body.byteLength;
      cache.delete(oldest);
    }
  }
  return new Response(hit.body, {
    headers: { "Content-Type": hit.type, "Cache-Control": "public, max-age=604800, immutable" },
  });
}
