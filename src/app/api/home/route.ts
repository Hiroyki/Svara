import { connection } from "next/server";
import { respond } from "@/lib/http";
import { getHome } from "@/lib/yt";

export async function GET() {
  await connection();
  return respond(getHome);
}
