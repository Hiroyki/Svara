import type { Card, Track } from "./types";

export function fmtTime(sec?: number): string {
  if (!sec || !Number.isFinite(sec) || sec < 0) return "0:00";
  const s = Math.floor(sec % 60);
  const m = Math.floor(sec / 60) % 60;
  const h = Math.floor(sec / 3600);
  const ss = String(s).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${ss}` : `${m}:${ss}`;
}

export function fmtTotal(tracks: Track[]): string {
  const sec = tracks.reduce((n, t) => n + (t.duration ?? 0), 0);
  const h = Math.floor(sec / 3600);
  const m = Math.round((sec % 3600) / 60);
  return h ? `${h} hr ${m} min` : `${m} min`;
}

export const artistNames = (t?: Track) => t?.artists.map((a) => a.name).join(", ") ?? "";

export function hrefFor(card: Card): string | null {
  switch (card.kind) {
    case "album":
      return `/album?id=${card.id}`;
    case "playlist":
      return `/playlist?id=${card.id}`;
    case "artist":
      return `/artist?id=${card.id}`;
    default:
      return null;
  }
}

export function greeting(): string {
  const h = new Date().getHours();
  if (h < 5) return "Late night vibes";
  if (h < 11) return "Good morning";
  if (h < 15) return "Good afternoon";
  if (h < 19) return "Good evening";
  return "Good night";
}

export function shuffleArray<T>(list: T[]): T[] {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
