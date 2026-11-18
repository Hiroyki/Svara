"use client";

import { AnimatePresence, motion } from "motion/react";
import { useUI } from "@/lib/ui";

export default function Toaster() {
  const toasts = useUI((s) => s.toasts);
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-28 z-[80] flex flex-col items-center gap-2 px-4" aria-live="polite">
      <AnimatePresence initial={false}>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            layout
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 420, damping: 30 }}
            className="max-w-md truncate rounded-lg bg-white px-4 py-2.5 text-[13px] font-semibold text-app shadow-[0_16px_32px_-12px_rgba(0,0,0,0.5)]"
          >
            {t.text}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
