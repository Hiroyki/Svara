import { respond } from "@/lib/http";
import { getAlbum } from "@/lib/yt";

export async function GET(_req: Request, ctx: RouteContext<"/api/album/[id]">) {
  const { id } = await ctx.params;
  return respond(() => getAlbum(id));
}
