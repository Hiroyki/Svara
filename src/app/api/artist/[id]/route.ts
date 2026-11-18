import { respond } from "@/lib/http";
import { getArtist } from "@/lib/yt";

export async function GET(_req: Request, ctx: RouteContext<"/api/artist/[id]">) {
  const { id } = await ctx.params;
  return respond(() => getArtist(id));
}
