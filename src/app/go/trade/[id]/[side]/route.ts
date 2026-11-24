import { and, eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db, linkTrades } from "@/db";
import { isLive } from "@/lib/tradez";

// A trade link on a public page: counts the click for the creator it sends traffic to, then goes there.
// "a" is the proposer's link (shown on the partner's page), "b" the partner's.
export async function GET(req: Request, ctx: RouteContext<"/go/trade/[id]/[side]">) {
  const { id, side } = await ctx.params;
  const tradeId = Number(id);
  const home = NextResponse.redirect(new URL("/", req.url));
  if (!Number.isInteger(tradeId) || (side !== "a" && side !== "b")) return home;
  const [row] = await db
    .update(linkTrades)
    .set(side === "a" ? { proposerClicks: sql`${linkTrades.proposerClicks} + 1` } : { partnerClicks: sql`${linkTrades.partnerClicks} + 1` })
    .where(and(eq(linkTrades.id, tradeId), isLive()))
    .returning({ url: side === "a" ? linkTrades.proposerUrl : linkTrades.partnerUrl });
  if (!row?.url) return home;
  const res = NextResponse.redirect(row.url, 302);
  res.headers.set("X-Robots-Tag", "noindex, nofollow");
  res.headers.set("Cache-Control", "no-store");
  return res;
}
