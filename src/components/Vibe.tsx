"use client";

import { AnimatePresence, motion } from "motion/react";
import { rgb, useArtColor } from "@/lib/color";
import { useCurrent, usePlayer } from "@/lib/player";

/**
 * Ambient "vibe": the gaps between the bento panels pick up the colour of
 * whatever is playing. Each colour change crossfades over ~1.2s.
 */
export default function Vibe() {
  const current = useCurrent();
  const playing = usePlayer((s) => s.playing);
  const c = useArtColor(current?.thumb);
  const key = current ? c.join(",") : "none";

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-0 overflow-hidden">
      <AnimatePresence>
        {current && (
          <motion.div
            key={key}
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: playing ? 1 : 0.55 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.2 }}
            style={{
              background: `radial-gradient(60% 55% at 85% 105%, ${rgb(c, 0.55)}, transparent 70%), radial-gradient(45% 50% at 0% 0%, ${rgb(c, 0.35)}, transparent 70%), radial-gradient(40% 40% at 100% 0%, ${rgb(c, 0.22)}, transparent 70%)`,
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
