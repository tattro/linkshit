import { eq, sql } from "drizzle-orm";
import { NextResponse, after } from "next/server";
import { db, events, links, offers, users } from "@/db";
import { androidIntent, appTarget, detectDevice } from "@/lib/deeplinks";
import { visitorInfo } from "@/lib/request";

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** Tiny page that tries the app first and falls back to the website (iOS can't do this with a redirect). */
function openInAppPage(appUrl: string, webUrl: string, appName: string) {
  const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex"><title>Opening ${esc(appName)}…</title>
<style>body{font-family:system-ui,sans-serif;display:flex;min-height:100vh;align-items:center;justify-content:center;margin:0;background:#f5f5f4;color:#1c1917;text-align:center}
a{display:inline-block;margin-top:16px;padding:12px 20px;border-radius:12px;background:#1c1917;color:#fff;text-decoration:none;font-weight:700}</style></head>
<body><div><p>Opening in ${esc(appName)}…</p><a id="web" href="${esc(webUrl)}">Open in browser instead</a></div>
<script>
var web=${JSON.stringify(webUrl)},left=false;
document.addEventListener("visibilitychange",function(){if(document.hidden)left=true});
setTimeout(function(){if(!left)location.replace(web)},1500);
location.href=${JSON.stringify(appUrl)};
</script></body></html>`;
  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } });
}

// Counts a click, then sends the visitor on their way (into the app when we can).
export async function GET(req: Request, ctx: RouteContext<"/go/[id]">) {
  const { id } = await ctx.params;
  const linkId = Number(id);
  const home = NextResponse.redirect(new URL("/", req.url));
  if (!Number.isInteger(linkId)) return home;

  const [link] = await db
    .select({
      url: links.url, userId: links.userId, bannedAt: users.bannedAt, startsAt: links.startsAt, endsAt: links.endsAt,
      openInApp: users.openInApp, deletedAt: links.deletedAt, offerId: links.offerId, offerActive: offers.active,
    })
    .from(links)
    .innerJoin(users, eq(users.id, links.userId))
    .leftJoin(offers, eq(offers.id, links.offerId))
    .where(eq(links.id, linkId));
  const now = new Date();
  if (!link || link.bannedAt || link.deletedAt || (link.offerId && !link.offerActive) || (link.startsAt && link.startsAt > now) || (link.endsAt && link.endsAt <= now)) return home;

  const visitor = visitorInfo(req.headers, new URL(req.url).host);
  after(async () => {
    await db.update(links).set({ clicks: sql`${links.clicks} + 1` }).where(eq(links.id, linkId));
    if (visitor) await db.insert(events).values({ userId: link.userId, linkId, kind: "click", ...visitor });
  });

  if (link.openInApp) {
    const device = detectDevice(req.headers.get("user-agent") ?? "");
    const target = appTarget(link.url);
    if (target && device.os === "android") return NextResponse.redirect(androidIntent(link.url, target.androidPackage), 302);
    if (target && device.os === "ios") return openInAppPage(target.ios, link.url, target.name);
  }
  return NextResponse.redirect(link.url, 302);
}
