import { eq, sql } from "drizzle-orm";
import { NextResponse, after } from "next/server";
import { db, events, links, users } from "@/db";
import { visitorInfo } from "@/lib/request";

// Counts a click, then sends the visitor on their way.
export async function GET(req: Request, ctx: RouteContext<"/go/[id]">) {
  const { id } = await ctx.params;
  const linkId = Number(id);
  const home = NextResponse.redirect(new URL("/", req.url));
  if (!Number.isInteger(linkId)) return home;

  const [link] = await db
    .select({ url: links.url, userId: links.userId, bannedAt: users.bannedAt, startsAt: links.startsAt, endsAt: links.endsAt })
    .from(links)
    .innerJoin(users, eq(users.id, links.userId))
    .where(eq(links.id, linkId));
  const now = new Date();
  if (!link || link.bannedAt || (link.startsAt && link.startsAt > now) || (link.endsAt && link.endsAt <= now)) return home;

  const visitor = visitorInfo(req.headers, new URL(req.url).host);
  after(async () => {
    await db.update(links).set({ clicks: sql`${links.clicks} + 1` }).where(eq(links.id, linkId));
    if (visitor) await db.insert(events).values({ userId: link.userId, linkId, kind: "click", ...visitor });
  });
  return NextResponse.redirect(link.url, 302);
}
