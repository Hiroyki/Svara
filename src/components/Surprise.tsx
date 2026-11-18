"use client";

import { Dices } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { getCached, HOME_URL } from "@/lib/fetcher";
import { usePlayer } from "@/lib/player";
import type { HomeData } from "@/lib/types";
import { toast } from "@/lib/ui";

/** Rolls a die: plays a random song from today's charts and mixes, then keeps going as radio. */
export default function Surprise() {
  const [rolls, setRolls] = useState(0);
  const [busy, setBusy] = useState(false);

  const roll = async () => {
    if (busy) return;
    setRolls((n) => n + 1);
    setBusy(true);
    try {
      const home = await getCached<HomeData>(HOME_URL);
      const pool = home.sections.flatMap((s) => s.tracks ?? []);
      const current = usePlayer.getState().queue[usePlayer.getState().index];
      const choices = pool.filter((t) => t.id !== current?.id);
      if (!choices.length) return toast("Nothing to roll yet");
      const pick = choices[Math.floor(Math.random() * choices.length)];
      usePlayer.getState().playTrack(pick);
      toast(`Surprise · ${pick.title} — ${pick.artists[0]?.name ?? ""}`);
    } catch {
      toast("Couldn't roll. Try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      onClick={roll}
      aria-label="Surprise me: play a random song"
      title="Surprise me"
      className="group grid size-8 place-items-center rounded-[10px] text-muted transition-colors hover:bg-green hover:text-app"
    >
      <motion.span key={rolls} initial={{ rotate: rolls ? -360 : 0, scale: rolls ? 0.6 : 1 }} animate={{ rotate: 0, scale: 1 }} transition={{ type: "spring", stiffness: 180, damping: 12 }}>
        <Dices className="size-4" />
      </motion.span>
    </button>
  );
}
