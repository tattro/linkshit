import { eq } from "drizzle-orm";
import { avatars, db } from "@/db";

// Serves profile photos. URLs carry ?v=<version>, so they can be cached forever.
export async function GET(_req: Request, ctx: RouteContext<"/avatar/[id]">) {
  const userId = Number((await ctx.params).id);
  if (!Number.isInteger(userId)) return new Response("Not found", { status: 404 });
  const [row] = await db.select().from(avatars).where(eq(avatars.userId, userId));
  if (!row) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(row.data), {
    headers: {
      "Content-Type": row.contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
