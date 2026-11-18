"use client";

import { Capacitor, registerPlugin, type PluginListenerHandle } from "@capacitor/core";
import { TARGET } from "./runtime";

/** Android shell plugin (android/app/src/main/java/app/svara/music/SvaraMediaPlugin.java). */
export type MediaAction = { action: "play" | "pause" | "next" | "prev" | "seek"; position?: number };

type SvaraMediaPlugin = {
  update(state: {
    title: string;
    artist: string;
    album: string;
    artwork: string;
    playing: boolean;
    position: number;
    duration: number;
  }): Promise<void>;
  stop(): Promise<void>;
  minimize(): Promise<void>;
  addListener(event: "action", cb: (e: MediaAction) => void): Promise<PluginListenerHandle>;
  addListener(event: "back", cb: () => void): Promise<PluginListenerHandle>;
};

export const SvaraMedia = registerPlugin<SvaraMediaPlugin>("SvaraMedia");

/** True inside the Android app (not the web build, not a browser opening the static export). */
export const isNativeApp = (): boolean => TARGET === "android" && Capacitor.isNativePlatform();
