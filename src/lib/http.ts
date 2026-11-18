/** JSON response. The server keeps its own in-memory cache, so browsers always revalidate. */
export async function respond<T>(fn: () => Promise<T>): Promise<Response> {
  try {
    const data = await fn();
    return Response.json(data, { headers: { "Cache-Control": "no-cache" } });
  } catch (err) {
    console.error("[svara]", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json({ error: message }, { status: 502 });
  }
}
