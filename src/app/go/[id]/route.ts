import { eq, sql } from "drizzle-orm";
import { geoTarget } from "@/lib/geo";
import { NextResponse, after } from "next/server";
import { db, events, links, offers, users } from "@/db";
import { androidIntent, appTarget, detectDevice } from "@/lib/deeplinks";
import { visitorInfo } from "@/lib/request";
import { lockCookie, tokenMatches } from "@/lib/locks";
import { withUtm } from "@/lib/tracking";

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
      lockCode: links.lockCode, androidUrl: links.androidUrl, geo: links.geo, music: links.music, latest: links.latest, heading: links.heading, utm: users.utm, handle: users.handle,
      pageLock: users.lockCode,
    })
    .from(links)
    .innerJoin(users, eq(users.id, links.userId))
    .leftJoin(offers, eq(offers.id, links.offerId))
    .where(eq(links.id, linkId));
  const now = new Date();
  if (!link || link.heading || link.bannedAt || link.deletedAt || (link.offerId && !link.offerActive) || (link.startsAt && link.startsAt > now) || (link.endsAt && link.endsAt <= now)) return home;

  // Locked link (or a link on a locked page): visitors type the code first
  const jar = req.headers.get("cookie") ?? "";
  const cookie = (name: string) => jar.split(/;\s*/).find((c) => c.startsWith(`${name}=`))?.slice(name.length + 1);
  if (link.pageLock && !tokenMatches(cookie(lockCookie("page", link.userId)), "page", link.userId, link.pageLock)) {
    return NextResponse.redirect(new URL(`/${link.handle}`, req.url));
  }
  if (link.lockCode && !tokenMatches(cookie(lockCookie("link", linkId)), "link", linkId, link.lockCode)) {
    return NextResponse.redirect(new URL(`/locked/${linkId}`, req.url));
  }

  const visitor = visitorInfo(req.headers, new URL(req.url).host);
  after(async () => {
    await db.update(links).set({ clicks: sql`${links.clicks} + 1` }).where(eq(links.id, linkId));
    if (visitor) await db.insert(events).values({ userId: link.userId, linkId, kind: "click", ...visitor });
  });

  const device = detectDevice(req.headers.get("user-agent") ?? "");
  // A separate Android link (e.g. Google Play when the main one is the App Store)
  // "Listen on Apple Music" etc. under a music link
  const to = new URL(req.url).searchParams.get("to");
  const musicUrl = to === "latest" ? link.latest?.item?.url : to ? link.music?.links.find((m) => m.p === to)?.url : undefined;
  // Country rules ("UK visitors go to the UK store") come before the Android link
  const geoUrl = to ? null : geoTarget(link.geo, req.headers.get("x-vercel-ip-country"));
  const base = musicUrl ?? geoUrl ?? (device.os === "android" && link.androidUrl ? link.androidUrl : link.url);
  const dest = link.utm ? withUtm(base, link.handle) : base;
  if (link.openInApp) {
    const target = appTarget(dest);
    if (target && device.os === "android") return NextResponse.redirect(androidIntent(dest, target.androidPackage), 302);
    if (target && device.os === "ios") return openInAppPage(target.ios, dest, target.name);
  }
  return NextResponse.redirect(dest, 302);
}
