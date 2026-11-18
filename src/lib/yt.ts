/* eslint-disable @typescript-eslint/no-explicit-any -- the upstream library's node types are a large union; we normalise them defensively here. */
import { Innertube, Parser } from "youtubei.js";
import type {
  ArtistPage,
  ArtistRef,
  Card,
  CardKind,
  Chip,
  Collection,
  HomeData,
  Lyrics,
  SearchResult,
  Section,
  Suggestion,
  Track,
} from "./types";

/* ------------------------------------------------------------------ client */

const g = globalThis as unknown as {
  __svaraYT?: Promise<Innertube> | null;
  __svaraCache?: Map<string, { at: number; v: unknown }>;
};

export function yt(): Promise<Innertube> {
  if (!g.__svaraYT) {
    g.__svaraYT = Innertube.create({
      generate_session_locally: true,
      retrieve_player: false,
      lang: "en",
      location: REGION,
      // bound wrapper: browsers throw "Illegal invocation" when window.fetch is called detached
      fetch: (input, init) => globalThis.fetch(input, init),
    }).catch((err) => {
      g.__svaraYT = null;
      throw err;
    });
  }
  return g.__svaraYT;
}

const cache = (g.__svaraCache ??= new Map());

async function cached<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T> {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < ttlMs) return hit.v as T;
  const v = await fn();
  cache.set(key, { at: Date.now(), v });
  if (cache.size > 400) cache.delete(cache.keys().next().value!);
  return v;
}

const MIN = 60_000;

/* ------------------------------------------------------------- normalisers */

const txt = (v: any): string => {
  if (v == null) return "";
  if (typeof v === "string") return v;
  if (typeof v.text === "string") return v.text;
  const s = typeof v.toString === "function" ? v.toString() : "";
  return s && s !== "[object Object]" ? s : "";
};

export function hiRes(url = "", size = 544): string {
  if (!url) return "";
  if (url.startsWith("//")) url = "https:" + url;
  if (/googleusercontent\.com|ggpht\.com/.test(url)) {
    return url.replace(/=w\d+-h\d+/, `=w${size}-h${size}`).replace(/=s\d+(?=[-?]|$)/, `=s${size}`);
  }
  return url;
}

function thumbList(item: any): any[] {
  const t = item?.thumbnail ?? item?.thumbnails;
  if (Array.isArray(t)) return t;
  if (Array.isArray(t?.contents)) return t.contents;
  return [];
}

function bestThumb(item: any, size = 544): string {
  const list = thumbList(item);
  if (!list.length) return "";
  const best = list.reduce((a, b) => ((b?.width ?? 0) > (a?.width ?? 0) ? b : a));
  return hiRes(best?.url, size);
}

function bannerOf(item: any): string {
  const list = thumbList(item);
  if (!list.length) return "";
  const best = list.reduce((a, b) => ((b?.width ?? 0) > (a?.width ?? 0) ? b : a));
  let url: string = best?.url ?? "";
  if (url.startsWith("//")) url = "https:" + url;
  return url.replace(/=w\d+-h\d+/, "=w1600-h666");
}

const TYPE_WORDS = /^(song|video|single|ep|album|playlist|artist|episode|podcast)$/i;

function artistsOf(item: any): ArtistRef[] {
  const raw: any[] = item?.artists?.length
    ? item.artists
    : item?.authors?.length
      ? item.authors
      : item?.author
        ? [item.author]
        : [];
  return raw
    .map((a) => (typeof a === "string" ? { name: a } : { name: txt(a?.name), id: a?.channel_id || undefined }))
    .filter((a) => a.name && !TYPE_WORDS.test(a.name));
}

function subtitleParts(item: any): string[] {
  return txt(item?.subtitle)
    .split(" • ")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function toTrack(item: any, fb: Partial<Track> = {}): Track | null {
  const id = item?.video_id ?? item?.id;
  if (typeof id !== "string" || id.length !== 11) return null;
  let artists = artistsOf(item);
  if (!artists.length && fb.artists?.length) artists = fb.artists;
  if (!artists.length) {
    const part = subtitleParts(item).find((s) => !TYPE_WORDS.test(s) && !/views|plays/i.test(s));
    if (part) artists = [{ name: part }];
  }
  const album = item?.album?.name ? { id: item.album.id || undefined, name: txt(item.album.name) } : fb.album;
  return {
    id,
    title: txt(item?.title) || txt(item?.name) || "Untitled",
    artists,
    album,
    duration: item?.duration?.seconds || fb.duration || undefined,
    thumb: bestThumb(item) || fb.thumb || `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
  };
}

function kindOf(item: any): CardKind | null {
  const t = item?.item_type;
  if (t === "album" || t === "playlist" || t === "artist" || t === "song" || t === "video") return t;
  const id: string = item?.id ?? "";
  if (id.startsWith("MPRE")) return "album";
  if (id.startsWith("UC")) return "artist";
  if (/^(VL|PL|RD|OLAK)/.test(id)) return "playlist";
  if (id.length === 11) return "song";
  return null;
}

export function toCard(item: any): Card | null {
  if (!item?.id) return null;
  const kind = kindOf(item);
  if (!kind) return null;
  let id: string = item.id;
  if (kind === "playlist" && id.startsWith("VL")) id = id.slice(2);

  let subtitle = txt(item.subtitle);
  if (!subtitle) {
    const author = artistsOf(item).map((a) => a.name).join(", ");
    subtitle = [kind === "album" ? "Album" : kind === "playlist" ? "Playlist" : "", author, item.year]
      .filter(Boolean)
      .join(" • ");
  }
  const card: Card = {
    id,
    kind,
    title: txt(item.title) || txt(item.name) || "Untitled",
    subtitle,
    thumb: bestThumb(item),
  };
  if (kind === "song" || kind === "video") card.track = toTrack(item) ?? undefined;
  return card;
}

const CHIP_COLORS = ["#ff4d6d", "#7c5cff", "#2ec4b6", "#ff9f1c", "#3a86ff", "#e056fd", "#06d6a0", "#f15bb5", "#4cc9f0", "#fb5607"];

function toSection(shelf: any): Section | null {
  const title = txt(shelf?.header?.title) || txt(shelf?.title);
  const items: any[] = shelf?.contents ?? [];
  if (!title || !items.length) return null;

  if (items.every((i) => i?.type === "MusicNavigationButton")) {
    const chips: Chip[] = items
      .map((i, n) => ({ label: txt(i.button_text), color: CHIP_COLORS[n % CHIP_COLORS.length] }))
      .filter((c) => c.label);
    return chips.length ? { title, chips } : null;
  }

  const tracks: Track[] = [];
  const cards: Card[] = [];
  for (const i of items) {
    if (i?.type === "MusicResponsiveListItem" && (i.item_type === "song" || i.item_type === "video")) {
      const t = toTrack(i);
      if (t) tracks.push(t);
    } else {
      const c = toCard(i);
      if (c) cards.push(c);
    }
  }
  if (tracks.length && tracks.length >= cards.length) return { title, tracks };
  return cards.length ? { title, cards } : null;
}

/* ---------------------------------------------------------------- queries */

/**
 * Region for charts and releases. The provider decides most of the home feed from the
 * caller's IP, so instead of trusting that we read the charts page for this region
 * explicitly and build the home sections from it.
 */
export const REGION = "US";
const REGION_NAME = "United States";

const shortChart = (t: string) =>
  t.replace(/\s*-?\s*United States$/i, "").replace(/ Music Videos/i, "").trim();

const cardsOf = (items: any[] = []) => items.map((i) => toCard(i)).filter((c): c is Card => !!c);

async function regionCharts() {
  const y = await yt();
  const r: any = await y.actions.execute("/browse", {
    browseId: "FEmusic_charts",
    formData: { selectedValues: [REGION] },
    client: "YTMUSIC",
  });
  const root: any = Parser.parseResponse(r.data).contents?.item?.();
  const shelves: any[] = root?.tabs?.[0]?.content?.contents ?? [];
  const shelf = (re: RegExp) => shelves.find((sh) => re.test(txt(sh?.header?.title)))?.contents;
  return { video: cardsOf(shelf(/video charts/i)), genres: cardsOf(shelf(/genre/i)), artists: cardsOf(shelf(/top artists/i)) };
}

/** Newest single/album from each of the region's top artists, newest first. */
async function releasesFrom(artists: Card[]): Promise<Card[]> {
  const pages = await Promise.allSettled(artists.slice(0, 12).map((a) => artistBase(a.id)));
  const best = new Map<number, { card: Card; year: number }>();
  pages.forEach((p, rank) => {
    if (p.status !== "fulfilled") return;
    const artist = p.value;
    for (const sec of artist.sections) {
      if (!/album|single|ep/i.test(sec.title) || /featured|appears/i.test(sec.title)) continue;
      const type = /single|ep/i.test(sec.title) ? "Single" : "Album";
      for (const c of sec.cards ?? []) {
        if (c.kind !== "album") continue;
        const year = Number(c.subtitle.match(/\d{4}/)?.[0] ?? 0);
        const cur = best.get(rank);
        if (!cur || year > cur.year) best.set(rank, { card: { ...c, subtitle: `${type} • ${artist.name}` }, year });
      }
    }
  });
  return [...best.entries()].sort(([ra, a], [rb, b]) => b.year - a.year || ra - rb).map(([, v]) => v.card);
}

export const getHome = () =>
  cached<HomeData>(`home:${REGION}`, 15 * MIN, async () => {
    const y = await yt();
    const [charts, home, explore] = await Promise.allSettled([regionCharts(), y.music.getHomeFeed(), y.music.getExplore()]);
    for (const [name, r] of [["charts", charts], ["home", home], ["explore", explore]] as const) {
      if (r.status === "rejected") console.warn(`[svara] ${name} source failed:`, r.reason);
    }
    const sections: Section[] = [];
    const add = (s: Section | null | undefined) => {
      if (s && !sections.some((x) => x.title === s.title)) sections.push(s);
    };

    if (charts.status === "fulfilled") {
      const c = charts.value;
      const top = c.video.find((x) => /top 100 music videos/i.test(x.title)) ?? c.video[0];
      const [topList, releases] = await Promise.all([
        top ? getPlaylist(top.id).catch(() => null) : null,
        releasesFrom(c.artists).catch(() => [] as Card[]),
      ]);
      if (topList?.tracks.length) add({ title: `Top 100 · ${REGION_NAME}`, tracks: topList.tracks.slice(0, 50) });
      if (releases.length) add({ title: "New releases", cards: releases });
      const lists = [...c.video, ...c.genres].map((x) => ({ ...x, title: shortChart(x.title) }));
      if (lists.length) add({ title: "Chart playlists", cards: lists });
      if (c.artists.length) add({ title: `Top artists · ${REGION_NAME}`, cards: c.artists });
    }
    // from the personal feed keep only song mixes; its other shelves follow the server's IP region
    if (home.status === "fulfilled") {
      ((home.value as any).sections ?? []).forEach((s: any) => {
        const sec = toSection(s);
        if (sec?.tracks?.length) add(sec);
      });
    }
    // from explore keep only the mood & genre list
    if (explore.status === "fulfilled") {
      ((explore.value as any).sections ?? []).forEach((s: any) => {
        const sec = toSection(s);
        if (sec?.chips?.length) add(sec);
      });
    }
    if (!sections.length) throw new Error("Upstream returned no content");
    return { sections };
  });

export const search = (q: string) =>
  cached<SearchResult>(`search:${q.toLowerCase()}`, 30 * MIN, async () => {
    const y = await yt();
    const run = async (type: "song" | "video" | "album" | "artist" | "playlist") => {
      try {
        const r: any = await y.music.search(q, { type });
        return (r.contents ?? []).flatMap((s: any) => s.contents ?? []) as any[];
      } catch {
        return [] as any[];
      }
    };
    const [songs, videos, albums, artists, playlists] = await Promise.all(
      (["song", "video", "album", "artist", "playlist"] as const).map(run),
    );
    const tracks = (l: any[]) => l.map((i) => toTrack(i)).filter((t): t is Track => !!t);
    const cards = (l: any[]) => l.map((i) => toCard(i)).filter((c): c is Card => !!c);
    return {
      songs: tracks(songs),
      videos: tracks(videos),
      albums: cards(albums),
      artists: cards(artists),
      playlists: cards(playlists),
    };
  });

export const suggest = (q: string) =>
  cached<Suggestion[]>(`suggest:${q.toLowerCase()}`, 30 * MIN, async () => {
    const y = await yt();
    const sections: any = await y.music.getSearchSuggestions(q);
    const out: Suggestion[] = [];
    for (const sec of sections ?? []) {
      for (const c of sec?.contents ?? []) {
        if (c?.type === "SearchSuggestion") {
          const text = txt(c.suggestion);
          if (text) out.push({ kind: "query", text });
        } else {
          const card = toCard(c);
          if (card) out.push({ kind: "item", card });
        }
      }
    }
    return out.slice(0, 10);
  });

function strapArtists(h: any): ArtistRef[] {
  const runs: any[] = h?.strapline_text_one?.runs ?? [];
  const linked = runs
    .filter((r) => r?.endpoint?.payload?.browseId?.startsWith?.("UC"))
    .map((r) => ({ name: txt(r.text), id: r.endpoint.payload.browseId as string }));
  if (linked.length) return linked;
  const name = txt(h?.strapline_text_one) || txt(h?.author?.name);
  return name ? [{ name }] : [];
}

export const getAlbum = (id: string) =>
  cached<Collection>(`album:${id}`, 60 * MIN, async () => {
    const y = await yt();
    const a: any = await y.music.getAlbum(id);
    const h = a.header?.header ?? a.header;
    const title = txt(h?.title) || "Album";
    const thumb = bestThumb(h);
    const artists = strapArtists(h);
    const tracks = (a.contents ?? [])
      .map((i: any) => toTrack(i, { thumb, artists, album: { id, name: title } }))
      .filter((t: Track | null): t is Track => !!t)
      .map((t: Track) => ({ ...t, thumb: t.thumb.includes("i.ytimg.com") ? thumb : t.thumb }));
    return {
      kind: "album",
      id,
      title,
      subtitle: txt(h?.subtitle),
      meta: txt(h?.second_subtitle),
      description: txt(h?.description?.description ?? h?.description),
      thumb,
      artists,
      tracks,
    };
  });

export const getPlaylist = (id: string) =>
  cached<Collection>(`playlist:${id}`, 30 * MIN, async () => {
    const y = await yt();
    const first: any = await y.music.getPlaylist(id);
    const items: any[] = [...(first.items ?? [])];
    let page: any = first;
    for (let n = 0; n < 6 && page?.has_continuation && items.length < 400; n++) {
      try {
        page = await page.getContinuation();
        items.push(...(page.items ?? []));
      } catch {
        break;
      }
    }
    const h = first.header?.header ?? first.header;
    return {
      kind: "playlist",
      id,
      title: txt(h?.title) || "Playlist",
      subtitle: txt(h?.subtitle),
      meta: txt(h?.second_subtitle),
      description: txt(h?.description?.description ?? h?.description),
      thumb: bestThumb(h),
      artists: strapArtists(h),
      tracks: items.map((i) => toTrack(i)).filter((t): t is Track => !!t),
    };
  });

/** Artist page without the listener count (one request). */
const artistBase = (id: string) =>
  cached<ArtistPage>(`artist-base:${id}`, 60 * MIN, async () => {
    const y = await yt();
    const a: any = await y.music.getArtist(id);
    const h = a.header;
    const sections: Section[] = [];
    let topSongs: Track[] = [];
    for (const s of a.sections ?? []) {
      const sec = toSection(s);
      if (!sec) continue;
      if (!topSongs.length && sec.tracks?.length) topSongs = sec.tracks;
      else sections.push(sec);
    }
    return {
      id,
      name: txt(h?.title) || "Artist",
      audience: "",
      banner: bannerOf(h),
      thumb: bestThumb(h, 400),
      description: txt(h?.description),
      topSongs,
      sections,
    };
  });

export const getArtist = (id: string) =>
  cached<ArtistPage>(`artist:${id}`, 60 * MIN, async () => {
    const base = await artistBase(id);
    // the artist page has no listener count; the artist search result does
    let audience = "";
    try {
      const y = await yt();
      const r: any = await y.music.search(base.name, { type: "artist" });
      const hit = (r.contents ?? []).flatMap((s: any) => s.contents ?? []).find((i: any) => i?.id === id);
      audience = subtitleParts(hit).find((p) => /audience|subscriber|listener/i.test(p)) ?? "";
    } catch {
      /* optional */
    }
    return { ...base, audience };
  });

export const getUpNext = (id: string) =>
  cached<Track[]>(`next:${id}`, 30 * MIN, async () => {
    const y = await yt();
    const p: any = await y.music.getUpNext(id, true);
    return (p.contents ?? [])
      .map((c: any) => c?.primary ?? c)
      .filter((c: any) => c?.type === "PlaylistPanelVideo")
      .map((c: any) => toTrack(c))
      .filter((t: Track | null): t is Track => !!t);
  });

export const getLyrics = (id: string) =>
  cached<Lyrics>(`lyrics:${id}`, 120 * MIN, async () => {
    const y = await yt();
    const l: any = await y.music.getLyrics(id).catch(() => undefined);
    return { text: txt(l?.description), source: txt(l?.footer) };
  });
