"use client";

import { motion } from "motion/react";
import { useEffect } from "react";
import { EASE } from "./motion";

const HEIGHTS = [20, 32, 46, 60, 76, 92, 76, 60, 46, 32, 20];
export const INTRO_MS = 1700;

/**
 * Launch animation, every time the app opens: the green tile pops in, the
 * waveform grows out from the centre and pulses once, "SVARA" rises letter by
 * letter, then the whole thing lifts away and the bento panels arrive.
 */
export default function Intro({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, INTRO_MS);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <motion.div
      className="fixed inset-0 z-[100] grid place-items-center bg-app"
      exit={{ opacity: 0, scale: 1.04, filter: "blur(6px)" }}
      transition={{ duration: 0.45, ease: EASE }}
      aria-hidden
    >
      <div className="flex flex-col items-center">
        <motion.svg
          viewBox="0 0 120 120"
          className="size-24"
          initial={{ scale: 0.4, opacity: 0, rotate: -8 }}
          animate={{ scale: 1, opacity: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 18 }}
        >
          <rect width="120" height="120" rx="22" className="fill-green" />
          {HEIGHTS.map((h, i) => {
            const fromCentre = Math.abs(i - 5);
            return (
              <motion.rect
                key={i}
                x={(120 - (11 * 4.5 + 10 * 3.5)) / 2 + i * 8}
                width={4.5}
                rx={2.25}
                fill="#fff"
                initial={{ height: 0, y: 60 }}
                animate={{ height: [0, h, h * 0.55, h], y: [60, 60 - h / 2, 60 - (h * 0.55) / 2, 60 - h / 2] }}
                transition={{ duration: 0.9, times: [0, 0.45, 0.72, 1], ease: "easeInOut", delay: 0.18 + fromCentre * 0.045 }}
              />
            );
          })}
        </motion.svg>

        <div className="mt-5 flex overflow-hidden text-[26px] font-extrabold tracking-[0.12em] text-ink">
          {"SVARA".split("").map((ch, i) => (
            <motion.span key={i} initial={{ y: "110%" }} animate={{ y: 0 }} transition={{ duration: 0.5, ease: EASE, delay: 0.55 + i * 0.06 }}>
              {ch}
            </motion.span>
          ))}
        </div>

        <div className="mt-4 h-[3px] w-28 overflow-hidden rounded-full bg-white/10">
          <motion.div
            className="h-full origin-left rounded-full bg-green"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 1.1, ease: EASE, delay: 0.4 }}
          />
        </div>
      </div>
    </motion.div>
  );
}
