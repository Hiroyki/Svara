"use client";

import { useEffect, useSyncExternalStore } from "react";
import { IN_APP_DATA } from "./runtime";

type Entry = { data?: unknown; error?: string };

const cache = new Map<string, Entry>();
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

export async function fetchJson<T>(url: string): Promise<T> {
  // Android has no Svara server: answer /api/* inside the app
  if (IN_APP_DATA && url.startsWith("/api/")) {
    const { localApi } = await import("./localApi");
    return (await localApi(url)) as T;
  }
  const res = await fetch(url);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body?.error ?? `Request failed (${res.status})`);
  return body as T;
}

function load(url: string) {
  if (cache.has(url)) return;
  cache.set(url, {});
  notify();
  fetchJson(url)
    .then((data) => cache.set(url, { data }))
    .catch((err: Error) => cache.set(url, { error: err.message }))
    .finally(notify);
}

/** Prime the cache (e.g. on hover) so the next page opens instantly. */
export function prefetch(url: string) {
  load(url);
}

export async function getCached<T>(url: string): Promise<T> {
  const hit = cache.get(url);
  if (hit?.data) return hit.data as T;
  const data = await fetchJson<T>(url);
  cache.set(url, { data });
  return data;
}

const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => listeners.delete(cb);
};

export function useFetch<T>(url: string | null) {
  const entry = useSyncExternalStore(
    subscribe,
    () => (url ? cache.get(url) : undefined),
    () => undefined,
  );
  useEffect(() => {
    if (url) load(url);
  }, [url]);
  return {
    data: entry?.data as T | undefined,
    error: entry?.error,
    loading: !!url && !entry?.data && !entry?.error,
    retry: () => {
      if (!url) return;
      cache.delete(url);
      load(url);
    },
  };
}

/** Home feed URL. The region is part of the URL so a region change never serves a stale browser cache. */
export const HOME_URL = "/api/home?region=US";
