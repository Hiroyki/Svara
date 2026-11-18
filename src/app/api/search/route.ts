import type { NextRequest } from "next/server";
import { respond } from "@/lib/http";
import { search } from "@/lib/yt";

export function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (!q) return Response.json({ error: "Missing q" }, { status: 400 });
  return respond(() => search(q));
}
