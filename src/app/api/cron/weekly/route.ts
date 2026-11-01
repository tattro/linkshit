import { and, eq, gte, isNotNull, isNull, sql } from "drizzle-orm";
import { db, events, links, users } from "@/db";
import { sendEmail } from "@/lib/email";
import { rateLimit } from "@/lib/ratelimit";
import { oneClickUrl, unsubscribeUrl } from "@/lib/unsubscribe";

// Resend's free plan allows 100 emails a day, so leave room for signups and resets
const MAX_PER_RUN = 90;
const DAY = 24 * 60 * 60 * 1000;

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

function change(now: number, before: number) {
  if (before === 0) return now > 0 ? "new this week" : "";
  const pct = Math.round(((now - before) / before) * 100);
  return pct === 0 ? "same as last week" : `${pct > 0 ? "▲" : "▼"} ${Math.abs(pct)}% vs last week`;
}

/** Monday stats email, triggered by the Vercel cron in vercel.json. */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const base = (process.env.NEXT_PUBLIC_SITE_URL || "https://linksh.it").replace(/\/$/, "");
  const weekAgo = new Date(Date.now() - 7 * DAY);
  const twoWeeksAgo = new Date(Date.now() - 14 * DAY);
  const cut = sql`${weekAgo.toISOString()}::timestamptz`; // raw sql params need a string, not a Date

  const stats = await db
    .select({
      id: users.id,
      email: users.email,
      handle: users.handle,
      views: sql<number>`count(*) filter (where ${events.kind} = 'view' and ${events.createdAt} >= ${cut})::int`,
      clicks: sql<number>`count(*) filter (where ${events.kind} = 'click' and ${events.createdAt} >= ${cut})::int`,
      prevViews: sql<number>`count(*) filter (where ${events.kind} = 'view' and ${events.createdAt} < ${cut})::int`,
      prevClicks: sql<number>`count(*) filter (where ${events.kind} = 'click' and ${events.createdAt} < ${cut})::int`,
    })
    .from(users)
    .innerJoin(events, eq(events.userId, users.id))
    .where(and(eq(users.weeklyEmail, true), isNotNull(users.emailVerifiedAt), isNull(users.bannedAt), gte(events.createdAt, twoWeeksAgo)))
    .groupBy(users.id)
    .having(sql`count(*) filter (where ${events.kind} = 'view' and ${events.createdAt} >= ${cut}) > 0`)
    .orderBy(sql`4 desc`)
    .limit(MAX_PER_RUN);

  let sent = 0;
  for (const u of stats) {
    // Never double-send if the cron fires twice
    if (!(await rateLimit(`weekly:user:${u.id}`, 1, 3 * 24 * 60 * 60))) continue;
    const [top] = await db
      .select({ title: links.title, clicks: sql<number>`count(*)::int` })
      .from(events)
      .innerJoin(links, eq(links.id, events.linkId))
      .where(and(eq(events.userId, u.id), eq(events.kind, "click"), gte(events.createdAt, weekAgo)))
      .groupBy(links.id)
      .orderBy(sql`2 desc`)
      .limit(1);

    const page = `${base}/${u.handle}`;
    const unsub = unsubscribeUrl(base, u.id);
    const lines = [
      `👀 ${u.views} view${u.views === 1 ? "" : "s"} ${change(u.views, u.prevViews) && `(${change(u.views, u.prevViews)})`}`.trim(),
      `👆 ${u.clicks} click${u.clicks === 1 ? "" : "s"} ${change(u.clicks, u.prevClicks) && `(${change(u.clicks, u.prevClicks)})`}`.trim(),
      top ? `🏆 Top link: ${top.title} (${top.clicks} click${top.clicks === 1 ? "" : "s"})` : "",
    ].filter(Boolean);

    const subject = `Your shit got ${u.views} view${u.views === 1 ? "" : "s"} this week 💩`;
    const text = `Here's how linksh.it/${u.handle} did this week:\n\n${lines.join("\n")}\n\nFull stats: ${base}/dashboard/analytics\nYour page: ${page}\n\nDon't want these? Unsubscribe: ${unsub}\n— linksh.it`;
    const html = `<div style="font-family:system-ui,sans-serif;max-width:480px;margin:auto;padding:24px;color:#1c1917">
<p style="font-family:monospace;font-size:20px;font-weight:700">linksh<span style="color:#84cc16">.</span>it</p>
<h1 style="font-size:22px">Your week on linksh.it/${esc(u.handle)}</h1>
${lines.map((l) => `<p style="font-size:17px;margin:8px 0">${esc(l)}</p>`).join("")}
<p style="margin-top:20px"><a href="${esc(base)}/dashboard/analytics" style="display:inline-block;background:#1c1917;color:#fff;padding:12px 20px;border-radius:12px;text-decoration:none;font-weight:700">See full stats</a></p>
<p style="color:#78716c;font-size:13px">Don't want these? <a href="${esc(unsub)}" style="color:#78716c">Unsubscribe</a> or turn it off in your dashboard.</p></div>`;

    const ok = await sendEmail(u.email, subject, text, html, {
      "List-Unsubscribe": `<${oneClickUrl(base, u.id)}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    });
    if (ok) sent++;
  }
  return Response.json({ candidates: stats.length, sent });
}
