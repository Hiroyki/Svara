"use client";

import { useSearchParams } from "next/navigation";
import CollectionView from "@/components/CollectionView";

export default function AlbumPage() {
  const id = useSearchParams().get("id") ?? "";
  return <CollectionView key={id} kind="album" id={id} />;
}
