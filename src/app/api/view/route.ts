import { eq } from "drizzle-orm";
import { after } from "next/server";
import { db, events, users } from "@/db";
import { rateLimit } from "@/lib/ratelimit";
import { visitorInfo } from "@/lib/request";
import { QR_REFERRER } from "@/lib/qr";
import { refreshStaleLatest } from "@/lib/latest";

// Page-view beacon sent by public profile pages once they load in a real browser.
export async function POST(req: Request) {
  let body: { u?: unknown; r?: unknown; q?: unknown };
  try { body = JSON.parse(await req.text()); } catch { return new Response(null, { status: 400 }); }
  const userId = Number(body.u);
  if (!Number.isInteger(userId)) return new Response(null, { status: 400 });

  // Use the page's own referrer (document.referrer), not the beacon's
  const h = new Headers(req.headers);
  if (typeof body.r === "string" && body.r) h.set("referer", body.r.slice(0, 500)); else h.delete("referer");
  const visitor = visitorInfo(h, new URL(req.url).host);
  if (!visitor) return new Response(null, { status: 204 });
  if (body.q === 1) visitor.referrer = QR_REFERRER;

  const ip = h.get("x-real-ip") ?? h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  after(async () => {
    // Count each visitor at most once per half hour per page
    if (!(await rateLimit(`view:${userId}:${ip}${body.q === 1 ? ":qr" : ""}`, 1, 30 * 60))) return;
    const [user] = await db.select({ id: users.id }).from(users).where(eq(users.id, userId));
    if (!user) return;
    await db.insert(events).values({ userId, kind: "view", ...visitor });
    await refreshStaleLatest(userId);
  });
  return new Response(null, { status: 204 });
}
