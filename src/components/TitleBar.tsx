"use client";

import { useCurrent, usePlayer } from "@/lib/player";
import { TARGET } from "@/lib/runtime";
import { LogoMark } from "./Logo";

/**
 * Windows only: the window has no system title bar (titleBarStyle "hidden"), so this
 * 36px strip is the drag area. Windows draws its own caption buttons on the right.
 */
export default function TitleBar() {
  const current = useCurrent();
  const playing = usePlayer((s) => s.playing);
  if (TARGET !== "desktop") return null;
  return (
    <div className="relative z-20 flex h-9 shrink-0 items-center gap-2 pl-4 pr-[150px] text-[12px] font-semibold text-muted [-webkit-app-region:drag]">
      <LogoMark size={16} />
      <span className="text-ink">Svara</span>
      {current && (
        <span className="truncate font-medium text-faint">
          · {playing ? "" : "Paused · "}
          {current.title} — {current.artists[0]?.name}
        </span>
      )}
    </div>
  );
}
