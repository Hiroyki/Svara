"use client";

import { useEffect, useMemo, useRef } from "react";
import { usePlayer } from "@/lib/player";

/**
 * Lyrics that follow the song. YouTube Music lyrics have no timestamps, so the
 * "current" line is estimated from playback progress (skipping a short intro
 * and outro). Scrolling by hand pauses the follow for a few seconds.
 */
export default function FollowLyrics({
  text,
  source,
  className = "",
  size = "sm",
}: {
  text: string;
  source?: string;
  className?: string;
  size?: "sm" | "lg";
}) {
  const box = useRef<HTMLDivElement>(null);
  const lineEls = useRef<(HTMLParagraphElement | null)[]>([]);
  const touchedAt = useRef(0);
  const position = usePlayer((s) => s.position);
  const duration = usePlayer((s) => s.duration);
  const lines = useMemo(() => text.split("\n"), [text]);

  const progress = duration ? Math.min(1, Math.max(0, (position / duration - 0.07) / 0.85)) : 0;
  const sung = lines.map((l, i) => ({ l, i })).filter((x) => x.l.trim());
  const currentIdx = sung.length ? sung[Math.min(sung.length - 1, Math.floor(progress * sung.length))].i : -1;

  useEffect(() => {
    const el = box.current;
    const line = lineEls.current[currentIdx];
    if (!el || !line || Date.now() - touchedAt.current < 4000) return;
    el.scrollTo({ top: line.offsetTop - el.clientHeight * 0.38, behavior: "smooth" });
  }, [currentIdx]);

  const touch = () => (touchedAt.current = Date.now());

  return (
    <div ref={box} onWheel={touch} onTouchMove={touch} className={`thin-scrollbar relative overflow-y-auto [mask-image:linear-gradient(180deg,transparent,#000_12%,#000_80%,transparent)] ${className}`}>
      <div className="py-[30%]">
        {lines.map((l, i) => (
          <p
            key={i}
            ref={(el) => {
              lineEls.current[i] = el;
            }}
            className={`origin-left font-bold transition-[color,opacity,transform] duration-500 ${
              size === "lg" ? "text-[26px] leading-[1.5] sm:text-[30px]" : "text-[15px] leading-[1.7]"
            } ${!l.trim() ? "h-4" : i === currentIdx ? "scale-[1.03] text-ink" : i < currentIdx ? "text-ink/35" : "text-ink/55"}`}
          >
            {l}
          </p>
        ))}
        {source && <p className="mt-6 text-[11.5px] font-medium text-faint">{source}</p>}
      </div>
    </div>
  );
}
