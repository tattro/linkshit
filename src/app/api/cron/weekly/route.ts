import { and, asc, eq, gte, isNotNull, isNull, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db, events, links, subscribers, users } from "@/db";
import { sendEmail } from "@/lib/email";
import { rateLimit } from "@/lib/ratelimit";
import { oneClickUrl, unsubscribeUrl } from "@/lib/unsubscribe";

// Resend's free plan allows 100 emails a day, so leave room for signups and resets
const MAX_PER_RUN = 90;
const DAY = 24 * 60 * 60 * 1000;

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
const plural = (n: number, word: string) => `${n.toLocaleString()} ${word}${n === 1 ? "" : "s"}`;

function change(now: number, before: number, period: string) {
  if (before === 0) return now > 0 ? `new this ${period}` : "";
  const pct = Math.round(((now - before) / before) * 100);
  return pct === 0 ? `same as last ${period}` : `${pct > 0 ? "▲" : "▼"} ${Math.abs(pct)}% vs last ${period}`;
}

/** A little roast for the link nobody clicks. Picked by seed so it changes each send. */
function roast(title: string, clicks: number, seed: number) {
  const t = `"${title}"`;
  const lines = clicks === 0
    ? [
        `Nobody clicked ${t}. Not even your mom.`,
        `${t} got zero clicks. It's not dead, it's just resting.`,
        `${t}: 0 clicks. Thoughts and prayers.`,
        `${t} got 0 clicks. Maybe it's time to let it go.`,
      ]
    : [
        `${t} continues to fight for its life (${plural(clicks, "click")}).`,
        `${t} is hanging on by a thread (${plural(clicks, "click")}).`,
        `${t} got ${plural(clicks, "click")}. Participation trophy incoming.`,
        `${t} scraped together ${plural(clicks, "click")}. Rough out there.`,
      ];
  return `🪦 ${lines[seed % lines.length]}`;
}

async function sendReports(every: "week" | "month", base: string, cap: number) {
  const days = every === "week" ? 7 : 30;
  const now = Date.now();
  const cutDate = new Date(now - days * DAY);
  const cut = sql`${cutDate.toISOString()}::timestamptz`; // raw sql params need a string, not a Date

  // Each page gets its own email, sent to the account that owns it
  const account = alias(users, "account");
  const stats = await db
    .select({
      id: users.id,
      accountId: account.id,
      email: account.email,
      handle: users.handle,
      views: sql<number>`count(*) filter (where ${events.kind} = 'view' and ${events.createdAt} >= ${cut})::int`,
      clicks: sql<number>`count(*) filter (where ${events.kind} = 'click' and ${events.createdAt} >= ${cut})::int`,
      prevViews: sql<number>`count(*) filter (where ${events.kind} = 'view' and ${events.createdAt} < ${cut})::int`,
      prevClicks: sql<number>`count(*) filter (where ${events.kind} = 'click' and ${events.createdAt} < ${cut})::int`,
    })
    .from(users)
    .innerJoin(account, eq(account.id, sql`coalesce(${users.ownerId}, ${users.id})`))
    .innerJoin(events, eq(events.userId, users.id))
    .where(and(
      eq(account.weeklyEmail, true), eq(account.statsEvery, every), isNotNull(account.emailVerifiedAt), isNotNull(account.email),
      isNull(account.bannedAt), isNull(users.bannedAt), gte(events.createdAt, new Date(now - 2 * days * DAY)),
    ))
    .groupBy(users.id, account.id)
    .having(sql`count(*) filter (where ${events.kind} = 'view' and ${events.createdAt} >= ${cut}) > 0`)
    .orderBy(sql`5 desc`)
    .limit(cap);

  let sent = 0;
  for (const u of stats) {
    // Never double-send if the cron fires twice
    if (!(await rateLimit(`stats:${every}:user:${u.id}`, 1, (days - 3) * 24 * 60 * 60))) continue;

    // Clicks per live link this period, best first
    const perLink = await db
      .select({
        title: links.title,
        clicks: sql<number>`count(${events.id}) filter (where ${events.kind} = 'click' and ${events.createdAt} >= ${cut})::int`,
      })
      .from(links)
      .leftJoin(events, eq(events.linkId, links.id))
      .where(and(eq(links.userId, u.id), isNull(links.deletedAt)))
      .groupBy(links.id)
      .orderBy(sql`2 desc`, asc(links.position));
    const [{ subs }] = await db
      .select({ subs: sql<number>`count(*)::int` })
      .from(subscribers)
      .where(and(eq(subscribers.userId, u.id), gte(subscribers.createdAt, cutDate)));
    const top = perLink[0]?.clicks ? perLink[0] : null;
    const worst = perLink.length >= 2 ? perLink[perLink.length - 1] : null;

    const page = `${base}/${u.handle}`;
    const unsub = unsubscribeUrl(base, u.accountId);
    const viewChange = change(u.views, u.prevViews, every);
    const clickChange = change(u.clicks, u.prevClicks, every);
    const lines = [
      `👀 ${plural(u.views, "view")}${viewChange && ` (${viewChange})`}`,
      `👆 ${plural(u.clicks, "click")}${clickChange && ` (${clickChange})`}`,
      top ? `🏆 Top link: "${top.title}" (${plural(top.clicks, "click")})` : "",
      subs ? `📬 ${plural(subs, "new subscriber")}. Grab the list from your dashboard.` : "",
      worst && worst !== top ? roast(worst.title, worst.clicks, u.id + Math.floor(now / (7 * DAY))) : "",
    ].filter(Boolean);

    const up = u.views > u.prevViews;
    const subject = up
      ? `Your sh.it did numbers this ${every} 📈`
      : `Your ${every === "week" ? "weekly" : "monthly"} sh.it report 💩`;
    const intro = `${up ? "Look at you." : "Here's the damage."} linksh.it/${u.handle} this ${every}:`;
    const text = `${intro}\n\n${lines.join("\n")}\n\nFull stats: ${base}/dashboard/analytics\nYour page: ${page}\n\nDon't want these? Unsubscribe: ${unsub}\nOr switch to ${every === "week" ? "monthly" : "weekly"} in your dashboard.\n— linksh.it`;
    const html = `<div style="font-family:system-ui,sans-serif;max-width:480px;margin:auto;padding:24px;color:#1c1917">
<p style="font-family:monospace;font-size:20px;font-weight:700">linksh<span style="color:#84cc16">.</span>it</p>
<h1 style="font-size:22px">${esc(intro)}</h1>
${lines.map((l) => `<p style="font-size:17px;margin:8px 0">${esc(l)}</p>`).join("")}
<p style="margin-top:20px"><a href="${esc(base)}/dashboard/analytics" style="display:inline-block;background:#1c1917;color:#fff;padding:12px 20px;border-radius:12px;text-decoration:none;font-weight:700">See full stats</a></p>
<p style="color:#78716c;font-size:13px">Don't want these? <a href="${esc(unsub)}" style="color:#78716c">Unsubscribe</a>, or switch to ${every === "week" ? "monthly" : "weekly"} in your dashboard.</p></div>`;

    const ok = await sendEmail(u.email!, subject, text, html, {
      "List-Unsubscribe": `<${oneClickUrl(base, u.accountId)}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    });
    if (ok) sent++;
  }
  return { candidates: stats.length, sent };
}

/** Stats emails, triggered every Monday by the Vercel cron in vercel.json. Monthly ones go out on the first Monday. */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }
  const base = (process.env.NEXT_PUBLIC_SITE_URL || "https://linksh.it").replace(/\/$/, "");
  const url = new URL(req.url);
  const firstMonday = new Date().getUTCDate() <= 7 || url.searchParams.get("monthly") === "1";

  const weekly = await sendReports("week", base, MAX_PER_RUN);
  const monthly = firstMonday ? await sendReports("month", base, MAX_PER_RUN - weekly.candidates) : null;
  return Response.json({ weekly, monthly });
}
