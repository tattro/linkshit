import { eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db, links } from "@/db";

// Counts a click, then sends the visitor on their way.
export async function GET(req: Request, ctx: RouteContext<"/go/[id]">) {
  const { id } = await ctx.params;
  const linkId = Number(id);
  if (!Number.isInteger(linkId)) return NextResponse.redirect(new URL("/", req.url));
  const [link] = await db
    .update(links)
    .set({ clicks: sql`${links.clicks} + 1` })
    .where(eq(links.id, linkId))
    .returning({ url: links.url });
  if (!link) return NextResponse.redirect(new URL("/", req.url));
  return NextResponse.redirect(link.url, 302);
}
