"use client";

import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { usePathname, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { installArtFallback } from "@/lib/art";
import { TARGET } from "@/lib/runtime";
import { usePlayer } from "@/lib/player";
import { useUI } from "@/lib/ui";
import ContextMenu from "./ContextMenu";
import Engine from "./Engine";
import Intro, { INTRO_MS } from "./Intro";
import MobileNav from "./MobileNav";
import NativeBridge from "./NativeBridge";
import { DUR, EASE } from "./motion";
import NowPlaying from "./NowPlaying";
import PlayerBar from "./PlayerBar";
import RightPanel from "./RightPanel";
import Shortcuts from "./Shortcuts";
import Sidebar from "./Sidebar";
import TitleBar from "./TitleBar";
import Toaster from "./Toaster";
import TopBar from "./TopBar";
import Vibe from "./Vibe";

/** Skip the launch animation when motion is reduced, or when the Windows app already played its splash. */
function skipIntro(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches || new URL(window.location.href).searchParams.get("from") === "splash";
}

/** Bento layout: sidebar | (top bar / main + right panel / player). See docs/design-system.md. */
export default function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const routeKey = `${pathname}?${useSearchParams().toString()}`;
  const scroller = useRef<HTMLDivElement>(null);
  const collapsed = useUI((s) => s.collapsed);
  // launch animation plays on every open; the panels wait for it (see --intro-delay)
  const [intro, setIntro] = useState(() => !skipIntro());
  const [panelDelay] = useState(() => (skipIntro() ? 0 : INTRO_MS - 200));
  const endIntro = useCallback(() => setIntro(false), []);

  useEffect(() => {
    void usePlayer.persist.rehydrate();
    useUI.getState().restore();
    // drop the one-off ?from=splash marker from the address
    const url = new URL(window.location.href);
    if (url.searchParams.has("from")) {
      url.searchParams.delete("from");
      window.history.replaceState(window.history.state, "", url);
    }
    return installArtFallback();
  }, []);

  useEffect(() => {
    scroller.current?.scrollTo({ top: 0 });
  }, [routeKey]);

  return (
    <MotionConfig reducedMotion="user" transition={{ duration: DUR.base, ease: EASE }}>
      <div className="relative flex h-dvh flex-col bg-app" style={{ "--intro-delay": `${panelDelay}ms` } as React.CSSProperties}>
        <AnimatePresence>{intro && <Intro key="intro" onDone={endIntro} />}</AnimatePresence>
        <Vibe />
        <TitleBar />
        <div
          className={`relative z-10 grid min-h-0 flex-1 gap-2 p-2 transition-[grid-template-columns] duration-300 md:grid-rows-[56px_minmax(0,1fr)_84px] ${
            collapsed
              ? "md:grid-cols-[72px_minmax(0,1fr)] xl:grid-cols-[72px_minmax(0,1fr)_316px]"
              : "md:grid-cols-[228px_minmax(0,1fr)] xl:grid-cols-[228px_minmax(0,1fr)_316px]"
          } grid-rows-[56px_minmax(0,1fr)_76px]`}
        >
          <Sidebar />
          <TopBar />
          <main
            ref={scroller}
            id="scroller"
            className="thin-scrollbar animate-in relative min-h-0 overflow-y-auto rounded-2xl bg-panel [animation-delay:calc(var(--intro-delay,0ms)+120ms)] md:col-start-2 md:row-start-2"
          >
            {/* every route change rises in */}
            <motion.div
              key={routeKey}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mx-auto w-full max-w-[1200px] p-4 pb-10 sm:p-5 sm:pb-12"
            >
              {children}
            </motion.div>
          </main>
          <RightPanel />
          <PlayerBar />
        </div>
        <MobileNav />
        <NowPlaying />
        <ContextMenu />
        <Toaster />
        <Engine />
        <Shortcuts />
        {TARGET === "android" && <NativeBridge />}
      </div>
    </MotionConfig>
  );
}
