"use client";

import { useSearchParams } from "next/navigation";
import CollectionView from "@/components/CollectionView";

export default function PlaylistPage() {
  const id = useSearchParams().get("id") ?? "";
  return <CollectionView key={id} kind="playlist" id={id} />;
}
