"use client";

import { create } from "zustand";
import type { Track } from "./types";

type Toast = { id: number; text: string };
type Menu = { track: Track; x: number; y: number; playlistId?: string } | null;

type UI = {
  toasts: Toast[];
  menu: Menu;
  crumbs: string[];
  collapsed: boolean;
  help: boolean;
  setHelp: (open: boolean) => void;
  toast: (text: string) => void;
  dismiss: (id: number) => void;
  openMenu: (menu: NonNullable<Menu>) => void;
  closeMenu: () => void;
  setCrumbs: (crumbs: string[]) => void;
  toggleCollapsed: () => void;
  restore: () => void;
};

let seq = 0;
const KEY = "svara-sidebar-collapsed";

export const useUI = create<UI>((set, get) => ({
  toasts: [],
  menu: null,
  crumbs: [],
  collapsed: false,
  help: false,
  setHelp: (help) => set({ help }),
  toast: (text) => {
    const id = ++seq;
    set({ toasts: [...get().toasts.slice(-2), { id, text }] });
    setTimeout(() => get().dismiss(id), 2600);
  },
  dismiss: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),
  openMenu: (menu) => set({ menu }),
  closeMenu: () => set({ menu: null }),
  setCrumbs: (crumbs) => set({ crumbs }),
  toggleCollapsed: () => {
    const collapsed = !get().collapsed;
    set({ collapsed });
    try {
      localStorage.setItem(KEY, collapsed ? "1" : "0");
    } catch {
      /* storage unavailable */
    }
  },
  restore: () => {
    try {
      set({ collapsed: localStorage.getItem(KEY) === "1" });
    } catch {
      /* storage unavailable */
    }
  },
}));

export const toast = (text: string) => useUI.getState().toast(text);
