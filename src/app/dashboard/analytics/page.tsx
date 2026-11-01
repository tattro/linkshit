import { and, desc, eq, gte, inArray, isNotNull, sql } from "drizzle-orm";
import Link from "next/link";
import { db, events, links } from "@/db";
import { accountPages, getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { switchPage } from "@/app/actions/pages";
import { DashboardHeader } from "../DashboardHeader";
import { DailyChart } from "./DailyChart";

export const metadata = { title: "Analytics" };

const RANGES = [7, 30, 90] as const;

/** Midnight UTC at the start of a range that ends today. */
function rangeStart(days: number) {
  const since = new Date(Date.now() - (days - 1) * 86_400_000);
  since.setUTCHours(0, 0, 0, 0);
  return since;
}

const countryName = (code: string) => {
  try { return new Intl.DisplayNames(["en"], { type: "region" }).of(code) ?? code; } catch { return code; }
};

function Ranked({ title, rows, empty }: { title: string; rows: { label: string; value: number }[]; empty: string }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <section className="rounded-2xl border-2 border-stone-900 bg-white p-6">
      <h2 className="mb-3 font-black">{title}</h2>
      {rows.length === 0 ? (
        <p className="text-sm text-stone-500">{empty}</p>
      ) : (
        <ul className="space-y-2">
          {rows.map((r) => (
            <li key={r.label} className="text-sm">
              <div className="flex justify-between gap-3">
                <span className="truncate">{r.label}</span>
                <span className="tabular-nums text-stone-600">{r.value.toLocaleString()}</span>
              </div>
              <div className="mt-1 h-2 rounded-full bg-lime-100">
                <div className="h-2 rounded-full bg-lime-700" style={{ width: `${(r.value / max) * 100}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border-2 border-stone-900 bg-white p-5">
      <p className="text-sm text-stone-500">{label}</p>
      <p className="mt-1 text-3xl font-black">{value}</p>
    </div>
  );
}

function PageComparison({ pages, stats, activeId, days }: {
  pages: { id: number; handle: string; displayName: string }[];
  stats: { userId: number; views: number; clicks: number }[];
  activeId: number;
  days: number;
}) {
  const rows = pages
    .map((p) => {
      const st = stats.find((x) => x.userId === p.id);
      return { ...p, views: st?.views ?? 0, clicks: st?.clicks ?? 0 };
    })
    .sort((a, b) => b.views - a.views || b.clicks - a.clicks);
  const max = Math.max(1, ...rows.map((r) => r.views));
  return (
    <section className="rounded-2xl border-2 border-stone-900 bg-white p-6">
      <h2 className="mb-3 font-black">All your pages <span className="font-normal text-stone-500">· last {days} days</span></h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-stone-500">
              <th className="pb-2 font-semibold">Page</th>
              <th className="pb-2 text-right font-semibold">Views</th>
              <th className="pb-2 text-right font-semibold">Clicks</th>
              <th className="pb-2 text-right font-semibold">Click rate</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.id} className={`border-t border-stone-200 ${r.id === activeId ? "bg-lime-50" : ""}`}>
                <td className="py-2 pr-4">
                  <form action={switchPage} className="min-w-0">
                    <input type="hidden" name="id" value={r.id} />
                    <input type="hidden" name="to" value="analytics" />
                    <input type="hidden" name="days" value={days} />
                    <button className="text-left hover:underline" title="Show this page's stats">
                      <span className="font-mono font-semibold">{i === 0 && r.views > 0 ? "👑 " : ""}linksh.it/{r.handle}</span>
                    </button>
                  </form>
                  <div className="mt-1 h-1.5 max-w-xs rounded-full bg-lime-100">
                    <div className="h-1.5 rounded-full bg-lime-700" style={{ width: `${(r.views / max) * 100}%` }} />
                  </div>
                </td>
                <td className="py-2 text-right tabular-nums">{r.views.toLocaleString()}</td>
                <td className="py-2 text-right tabular-nums">{r.clicks.toLocaleString()}</td>
                <td className="py-2 text-right tabular-nums">{r.views ? `${Math.round((r.clicks / r.views) * 100)}%` : "–"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-stone-500">Click a page to see its full stats below.</p>
    </section>
  );
}

export default async function Analytics({ searchParams }: PageProps<"/dashboard/analytics">) {
  const s = await getSession();
  if (!s) redirect("/login");
  const { page: user, account } = s;
  const pages = await accountPages(account.id);
  const { days: rawDays } = await searchParams;
  const days = RANGES.find((r) => String(r) === rawDays) ?? 30;
  const since = rangeStart(days);
  const inRange = and(eq(events.userId, user.id), gte(events.createdAt, since));

  const day = sql<string>`to_char(date_trunc('day', ${events.createdAt} at time zone 'UTC'), 'YYYY-MM-DD')`;
  const [daily, topLinks, referrers, countries, perPage] = await Promise.all([
    db.select({ day, kind: events.kind, n: sql<number>`count(*)::int` }).from(events).where(inRange).groupBy(day, events.kind),
    db.select({ label: links.title, value: sql<number>`count(*)::int` }).from(events)
      .innerJoin(links, eq(links.id, events.linkId))
      .where(and(inRange, eq(events.kind, "click"))).groupBy(links.id, links.title).orderBy(desc(sql`count(*)`)).limit(8),
    db.select({ label: events.referrer, value: sql<number>`count(*)::int` }).from(events)
      .where(and(inRange, eq(events.kind, "view"), isNotNull(events.referrer))).groupBy(events.referrer).orderBy(desc(sql`count(*)`)).limit(8),
    db.select({ label: events.country, value: sql<number>`count(*)::int` }).from(events)
      .where(and(inRange, eq(events.kind, "view"), isNotNull(events.country))).groupBy(events.country).orderBy(desc(sql`count(*)`)).limit(8),
    pages.length > 1
      ? db.select({
          userId: events.userId,
          views: sql<number>`count(*) filter (where ${events.kind} = 'view')::int`,
          clicks: sql<number>`count(*) filter (where ${events.kind} = 'click')::int`,
        }).from(events)
          .where(and(inArray(events.userId, pages.map((p) => p.id)), gte(events.createdAt, since))).groupBy(events.userId)
      : Promise.resolve([]),
  ]);

  const dates = Array.from({ length: days }, (_, i) => new Date(since.getTime() + i * 86_400_000).toISOString().slice(0, 10));
  const series = (kind: "view" | "click") =>
    dates.map((date) => ({ date, value: daily.find((d) => d.day === date && d.kind === kind)?.n ?? 0 }));
  const views = series("view"), clicks = series("click");
  const totalViews = views.reduce((n, d) => n + d.value, 0);
  const totalClicks = clicks.reduce((n, d) => n + d.value, 0);
  const ctr = totalViews ? `${Math.round((totalClicks / totalViews) * 100)}%` : "–";

  return (
    <div className="min-h-screen bg-stone-100 text-stone-900">
      <DashboardHeader active="analytics" />
      <main className="mx-auto max-w-6xl space-y-6 px-6 py-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-black">Who&apos;s been looking</h1>
            {pages.length > 1 && <p className="text-sm text-stone-500">Showing <span className="font-mono font-semibold text-stone-900">linksh.it/{user.handle}</span></p>}
          </div>
          <nav className="flex gap-1 rounded-full border-2 border-stone-900 bg-white p-1 text-sm" aria-label="Date range">
            {RANGES.map((r) => (
              <Link key={r} href={`/dashboard/analytics?days=${r}`} aria-current={r === days ? "page" : undefined}
                className={`rounded-full px-3 py-1 font-semibold ${r === days ? "bg-stone-900 text-white" : "text-stone-600 hover:bg-stone-100"}`}>
                {r} days
              </Link>
            ))}
          </nav>
        </div>

        {pages.length > 1 && <PageComparison pages={pages} stats={perPage} activeId={user.id} days={days} />}

        <div className="grid gap-4 *:min-w-0 sm:grid-cols-3">
          <Stat label="Page views" value={totalViews.toLocaleString()} />
          <Stat label="Link clicks" value={totalClicks.toLocaleString()} />
          <Stat label="Click-through rate" value={ctr} />
        </div>

        <div className="grid gap-6 *:min-w-0 lg:grid-cols-2">
          <section className="rounded-2xl border-2 border-stone-900 bg-white p-6"><DailyChart title="Page views per day" unit="views" data={views} /></section>
          <section className="rounded-2xl border-2 border-stone-900 bg-white p-6"><DailyChart title="Link clicks per day" unit="clicks" data={clicks} /></section>
        </div>

        <div className="grid gap-6 *:min-w-0 lg:grid-cols-3">
          <Ranked title="Top links" rows={topLinks} empty="No clicks yet." />
          <Ranked title="Where visitors came from" rows={referrers.map((r) => ({ label: r.label!, value: r.value }))} empty="No referrers yet. Direct visits and apps that hide the referrer aren't listed." />
          <Ranked title="Top countries" rows={countries.map((r) => ({ label: countryName(r.label!), value: r.value }))} empty="No country data yet. It appears once the site is live on Vercel." />
        </div>
        <p className="text-sm text-stone-500">Times are in UTC. Bots and link-preview crawlers aren&apos;t counted.</p>
      </main>
    </div>
  );
}

export const instant = false;
