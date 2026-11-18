import { respond } from "@/lib/http";
import { getPlaylist } from "@/lib/yt";

export async function GET(_req: Request, ctx: RouteContext<"/api/playlist/[id]">) {
  const { id } = await ctx.params;
  return respond(() => getPlaylist(id));
}
