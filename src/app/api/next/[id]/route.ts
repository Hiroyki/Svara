import { respond } from "@/lib/http";
import { getUpNext } from "@/lib/yt";

export async function GET(_req: Request, ctx: RouteContext<"/api/next/[id]">) {
  const { id } = await ctx.params;
  return respond(() => getUpNext(id));
}
