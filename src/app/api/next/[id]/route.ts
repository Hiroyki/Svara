import { type IdContext, respond } from "@/lib/http";
import { getUpNext } from "@/lib/yt";

export async function GET(_req: Request, ctx: IdContext) {
  const { id } = await ctx.params;
  return respond(() => getUpNext(id));
}
