"use client";

import { useEffect, useState } from "react";
import { proxyArt } from "./art";

export type RGB = [number, number, number];

const cache = new Map<string, RGB>();
const FALLBACK: RGB = [44, 44, 48];

function rgbToHsl([r, g, b]: RGB): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h / 6, s, l];
}

function hslToRgb(h: number, s: number, l: number): RGB {
  const f = (n: number) => {
    const k = (n + h * 12) % 12;
    const a = s * Math.min(l, 1 - l);
    return Math.round(255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))));
  };
  return [f(0), f(8), f(4)];
}

/** Pick the most characterful colour in the artwork, then tame it so white text stays readable. */
async function extract(url: string): Promise<RGB> {
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.decoding = "async";
  img.src = proxyArt(url);
  await img.decode();
  const size = 32;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return FALLBACK;
  ctx.drawImage(img, 0, 0, size, size);
  const data = ctx.getImageData(0, 0, size, size).data;

  // bucket hues, weight by saturation so a vivid accent beats a large grey area
  const buckets = new Map<number, { w: number; r: number; g: number; b: number }>();
  for (let i = 0; i < data.length; i += 4) {
    const px: RGB = [data[i], data[i + 1], data[i + 2]];
    const [h, s, l] = rgbToHsl(px);
    if (l < 0.08 || l > 0.94) continue;
    const key = Math.round(h * 18);
    const w = 0.15 + s * s * (1 - Math.abs(l - 0.5));
    const bk = buckets.get(key) ?? { w: 0, r: 0, g: 0, b: 0 };
    bk.w += w;
    bk.r += px[0] * w;
    bk.g += px[1] * w;
    bk.b += px[2] * w;
    buckets.set(key, bk);
  }
  let best: { w: number; r: number; g: number; b: number } | null = null;
  for (const bk of buckets.values()) if (!best || bk.w > best.w) best = bk;
  if (!best) return FALLBACK;
  const avg: RGB = [best.r / best.w, best.g / best.w, best.b / best.w];
  const [h, s, l] = rgbToHsl(avg);
  return hslToRgb(h, Math.min(0.62, s * 1.1), Math.max(0.26, Math.min(0.42, l)));
}

export function useArtColor(url?: string): RGB {
  const [color, setColor] = useState<{ url?: string; rgb: RGB }>({ rgb: FALLBACK });
  useEffect(() => {
    if (!url) return;
    const hit = cache.get(url);
    if (hit) {
      queueMicrotask(() => setColor({ url, rgb: hit }));
      return;
    }
    let alive = true;
    extract(url)
      .then((rgb) => {
        cache.set(url, rgb);
        if (alive) setColor({ url, rgb });
      })
      .catch(() => alive && setColor({ url, rgb: FALLBACK }));
    return () => {
      alive = false;
    };
  }, [url]);
  return color.url === url ? color.rgb : (url && cache.get(url)) || FALLBACK;
}

export const rgb = (c: RGB, a = 1) => `rgb(${c[0]} ${c[1]} ${c[2]} / ${a})`;
