"use client";

import { motion, type Variants } from "motion/react";

/*
 * Motion tokens — see docs/design-system.md → Motion.
 * One easing curve everywhere; lists reveal in a short stagger, capped so long
 * lists never feel slow. MotionConfig in Shell honours prefers-reduced-motion.
 */
export const EASE = [0.22, 1, 0.36, 1] as const;
export const DUR = { fast: 0.18, base: 0.4, slow: 0.7 } as const;

export const listV: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.035, delayChildren: 0.05 } },
};

export const itemV: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: DUR.base, ease: EASE } },
};

/** Reveals its children in sequence the first time it scrolls into view. */
export function Stagger({ className = "", children }: { className?: string; children: React.ReactNode }) {
  return (
    <motion.div className={className} variants={listV} initial="hidden" whileInView="show" viewport={{ once: true, amount: "some" }}>
      {children}
    </motion.div>
  );
}

export function Item({ className = "", children }: { className?: string; children: React.ReactNode }) {
  return (
    <motion.div className={className} variants={itemV}>
      {children}
    </motion.div>
  );
}

/** A section that fades up as it enters the viewport. */
export function Reveal({ className = "", children, delay = 0 }: { className?: string; children: React.ReactNode; delay?: number }) {
  return (
    <motion.section
      className={className}
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.1 }}
      transition={{ duration: DUR.base, ease: EASE, delay }}
    >
      {children}
    </motion.section>
  );
}

/** Little particle burst, e.g. when a song is liked. Mount it with a fresh key to replay. */
export function Burst({ color = "var(--color-green)" }: { color?: string }) {
  return (
    <span className="pointer-events-none absolute inset-0" aria-hidden>
      {Array.from({ length: 8 }, (_, i) => {
        const a = (i / 8) * Math.PI * 2;
        return (
          <motion.span
            key={i}
            className="absolute left-1/2 top-1/2 size-1 rounded-full"
            style={{ background: color, marginLeft: -2, marginTop: -2 }}
            initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
            animate={{ x: Math.cos(a) * 16, y: Math.sin(a) * 16, opacity: 0, scale: 0.4 }}
            transition={{ duration: 0.5, ease: EASE }}
          />
        );
      })}
    </span>
  );
}
