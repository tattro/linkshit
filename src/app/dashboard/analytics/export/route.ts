import { and, asc, eq, gte } from "drizzle-orm";
import { db, events, links } from "@/db";
import { getSession } from "@/lib/auth";

const RANGES = [7, 30, 90, 365];
const MAX_ROWS = 100_000;

const cell = (v: unknown) => {
  const s = v == null ? "" : String(v);
  // Quote everything; neutralise leading characters spreadsheets treat as formulas
  return `"${(/^[=+\-@\t\r]/.test(s) ? `'${s}` : s).replace(/"/g, '""')}"`;
};

// Every view and click on the page being edited, for the chosen date range, as CSV.
export async function GET(req: Request) {
  const s = await getSession();
  if (!s) return new Response("Log in first.", { status: 401 });
  const days = RANGES.find((r) => String(r) === new URL(req.url).searchParams.get("days")) ?? 30;
  const since = new Date(Date.now() - (days - 1) * 86_400_000);
  since.setUTCHours(0, 0, 0, 0);
  const rows = await db
    .select({ at: events.createdAt, kind: events.kind, link: links.title, url: links.url, referrer: events.referrer, country: events.country, device: events.device })
    .from(events)
    .leftJoin(links, eq(links.id, events.linkId))
    .where(and(eq(events.userId, s.page.id), gte(events.createdAt, since)))
    .orderBy(asc(events.createdAt))
    .limit(MAX_ROWS);
  const lines = [
    ["time_utc", "type", "link", "link_url", "referrer", "country", "device"].map(cell).join(","),
    ...rows.map((r) => [r.at.toISOString(), r.kind, r.link, r.url, r.referrer, r.country, r.device].map(cell).join(",")),
  ];
  return new Response(lines.join("\n") + "\n", {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="linksh.it-${s.page.handle}-${days}d.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
