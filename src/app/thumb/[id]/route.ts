import { eq } from "drizzle-orm";
import { db, linkThumbs } from "@/db";

// Serves link thumbnails. URLs carry ?v=<version>, so they can be cached forever.
export async function GET(_req: Request, ctx: RouteContext<"/thumb/[id]">) {
  const linkId = Number((await ctx.params).id);
  if (!Number.isInteger(linkId)) return new Response("Not found", { status: 404 });
  const [row] = await db.select().from(linkThumbs).where(eq(linkThumbs.linkId, linkId));
  if (!row) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(row.data), {
    headers: {
      "Content-Type": row.contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
