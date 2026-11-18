"use client";

import { motion } from "motion/react";
import { EASE } from "./motion";

/**
 * Full-width image card, grayscale, text anchored bottom-left. See docs/design-system.md → Hero.
 * The photo drifts slowly (Ken Burns) and the text rises in a short stagger.
 */
export default function Hero({
  image,
  fallback,
  label,
  title,
  meta,
  children,
  position = "center 30%",
  className = "",
}: {
  image?: string;
  /** Used when `image` fails to load (the CDN occasionally refuses a banner). */
  fallback?: string;
  label: React.ReactNode;
  title: string;
  meta?: React.ReactNode;
  children?: React.ReactNode;
  position?: string;
  className?: string;
}) {
  const long = title.length > 22;
  // square artwork comes at 544px; ask for a larger render so it stays sharp at hero width
  const src = image?.replace("=w544-h544", "=w1400-h1400");
  const rise = (delay: number) => ({
    initial: { opacity: 0, y: 14 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.55, ease: EASE, delay },
  });

  return (
    <section className={`relative isolate flex min-h-[240px] flex-col justify-end overflow-hidden rounded-2xl bg-raised p-6 sm:min-h-[300px] sm:p-8 ${className}`}>
      {src && (
        <motion.img
          src={src}
          alt=""
          data-fallback={fallback}
          className="absolute inset-0 -z-10 size-full object-cover grayscale"
          style={{ objectPosition: position }}
          initial={{ scale: 1.12, opacity: 0 }}
          animate={{ scale: 1.02, opacity: 1 }}
          transition={{ scale: { duration: 14, ease: "linear" }, opacity: { duration: 0.8 } }}
        />
      )}
      <div className="absolute inset-0 -z-10 bg-gradient-to-tr from-black/85 via-black/35 to-transparent" />
      <motion.div {...rise(0.1)} className="flex items-center gap-2 text-[12px] font-semibold text-white/85">
        {label}
      </motion.div>
      <motion.h1
        {...rise(0.18)}
        className={`mt-1.5 line-clamp-2 font-extrabold leading-[0.95] tracking-[-0.035em] text-white ${long ? "text-4xl sm:text-5xl" : "text-5xl sm:text-[68px]"}`}
      >
        {title}
      </motion.h1>
      {meta && (
        <motion.div {...rise(0.26)} className="mt-3 flex items-center gap-2 text-[12.5px] font-medium text-white/75">
          {meta}
        </motion.div>
      )}
      {children && <motion.div {...rise(0.32)}>{children}</motion.div>}
    </section>
  );
}
