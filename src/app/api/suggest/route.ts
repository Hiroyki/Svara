import type { NextRequest } from "next/server";
import { respond } from "@/lib/http";
import { suggest } from "@/lib/yt";

export function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (!q) return Response.json([]);
  return respond(() => suggest(q));
}
