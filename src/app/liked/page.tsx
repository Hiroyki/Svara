"use client";

import { Heart } from "lucide-react";
import Link from "next/link";
import { EmptyState } from "@/components/Bits";
import LocalList, { GlyphArt } from "@/components/LocalList";
import { useCrumbs } from "@/components/ui";
import { usePlayer } from "@/lib/player";

export default function LikedPage() {
  useCrumbs(["My music", "Favorite"]);
  const liked = usePlayer((s) => s.liked);
  return (
    <LocalList
      type="Collection"
      title="Favorite Songs"
      tracks={liked}
      art={<GlyphArt icon={Heart} green />}
      empty={
        <EmptyState title="No favorites yet" text="Tap the heart on any song and it lands here.">
          <Link href="/" className="mt-5 inline-block rounded-full bg-raised px-5 py-2 text-[13px] font-semibold hover:bg-white/10">
            Explore music
          </Link>
        </EmptyState>
      }
    />
  );
}
