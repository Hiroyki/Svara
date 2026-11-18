"use client";

import { X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect } from "react";
import { usePlayer } from "@/lib/player";
import { useUI } from "@/lib/ui";

const KEYS: [string[], string][] = [
  [["Space"], "Play / pause"],
  [["←", "→"], "Seek 5 seconds"],
  [["Shift", "←"], "Previous song"],
  [["Shift", "→"], "Next song"],
  [["↑", "↓"], "Volume"],
  [["M"], "Mute"],
  [["L"], "Like current song"],
  [["S"], "Shuffle"],
  [["R"], "Repeat"],
  [["F"], "Now Playing"],
  [["/"], "Search"],
  [["?"], "This list"],
];

function Help() {
  const open = useUI((s) => s.help);
  const setHelp = useUI((s) => s.setHelp);
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[90] grid place-items-center bg-black/60 p-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setHelp(false)}
        >
          <motion.div
            role="dialog"
            aria-label="Keyboard shortcuts"
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
            className="w-full max-w-md rounded-2xl bg-panel p-5 shadow-[0_30px_60px_-20px_rgba(0,0,0,0.8)]"
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-[17px] font-bold">Keyboard shortcuts</h2>
              <button onClick={() => setHelp(false)} className="grid size-8 place-items-center rounded-[10px] text-muted hover:bg-hover hover:text-ink" aria-label="Close">
                <X className="size-4" />
              </button>
            </div>
            <motion.ul
              className="grid gap-1"
              initial="hidden"
              animate="show"
              variants={{ hidden: {}, show: { transition: { staggerChildren: 0.025 } } }}
            >
              {KEYS.map(([keys, label]) => (
                <motion.li
                  key={label}
                  variants={{ hidden: { opacity: 0, x: -8 }, show: { opacity: 1, x: 0 } }}
                  className="flex items-center justify-between rounded-lg px-2 py-1.5 text-[13px] hover:bg-hover"
                >
                  <span className="font-medium text-muted">{label}</span>
                  <span className="flex gap-1">
                    {keys.map((k) => (
                      <kbd key={k} className="min-w-7 rounded-md border border-white/12 bg-raised px-1.5 py-0.5 text-center font-sans text-[11.5px] font-bold text-ink">
                        {k}
                      </kbd>
                    ))}
                  </span>
                </motion.li>
              ))}
            </motion.ul>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default function Shortcuts() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const s = usePlayer.getState();
      const ui = useUI.getState();
      const cur = s.queue[s.index];
      switch (e.key) {
        case "?":
          ui.setHelp(!ui.help);
          break;
        case " ":
          if (el?.getAttribute("role") === "button" || el?.tagName === "BUTTON") return;
          e.preventDefault();
          s.toggle();
          break;
        case "ArrowRight":
          if (e.shiftKey) s.next();
          else if (s.duration) s.seek(Math.min(s.duration - 1, s.position + 5));
          break;
        case "ArrowLeft":
          if (e.shiftKey) s.prev();
          else s.seek(Math.max(0, s.position - 5));
          break;
        case "ArrowUp":
          e.preventDefault();
          s.setVolume(s.volume + 0.05);
          break;
        case "ArrowDown":
          e.preventDefault();
          s.setVolume(s.volume - 0.05);
          break;
        case "m":
        case "M":
          s.toggleMute();
          break;
        case "l":
        case "L":
          if (cur) s.toggleLike(cur);
          break;
        case "s":
        case "S":
          s.toggleShuffle();
          break;
        case "r":
        case "R":
          s.cycleRepeat();
          break;
        case "f":
        case "F":
          if (cur) s.openNowPlaying(!s.nowPlaying);
          break;
        case "Escape":
          if (ui.help) ui.setHelp(false);
          else if (s.nowPlaying) s.openNowPlaying(false);
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  return <Help />;
}
