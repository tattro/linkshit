import "server-only";
import { and, desc, eq, gt, ilike, isNull, ne, or, sql } from "drizzle-orm";
import { notLiveYet } from "@/lib/live";
import { redirect } from "next/navigation";
import { db, linkTrades, users, type LinkTrade, type User } from "@/db";
import { getSession, isAdmin } from "@/lib/auth";
import type { TradeLink } from "@/components/ProfileView";

/**
 * Link Tradez: a directory of creators who want to swap links. Two creators agree on a trade and each one's
 * link shows in a small "Link trades" row at the bottom of the other's main page.
 *
 * Pre-launch it's a staff-only mock-up. Set LINK_TRADEZ_OPEN=1 to open it to every signed-in creator.
 */
export const tradezLaunched = () => process.env.LINK_TRADEZ_OPEN === "1";
export const canUseTradez = (account: Pick<User, "isAdmin" | "email">) => tradezLaunched() || isAdmin(account);

/** The signed-in account, or a redirect: to /login when signed out, to the dashboard when Link Tradez isn't open to them yet. */
export async function requireTradezAccount(): Promise<User> {
  const s = await getSession();
  if (!s) redirect("/login");
  if (!canUseTradez(s.account)) redirect("/dashboard");
  return s.account;
}

/** Live trades per page, so the bottom of a page stays a small row and a trade spot means something. */
export const MAX_ACTIVE_TRADES = 3;
export const MAX_TRADE_TITLE = 40;
export const MAX_NOTE = 300;
export const MAX_PITCH = 140;

/** How long a trade can run. The clock starts when the partner accepts; then both links come down by themselves. */
export const TRADE_DURATIONS = [7, 14, 30, 60] as const;
export const durationLabel = (days: number) => (days % 7 === 0 && days < 30 ? `${days / 7} week${days > 7 ? "s" : ""}` : `${days} days`);

/** SQL: the trade is live right now (accepted and not past its time limit). */
export const isLive = () => and(eq(linkTrades.status, "active"), gt(linkTrades.expiresAt, new Date()));
export const tradeIsLive = (t: Pick<LinkTrade, "status" | "expiresAt">, now = new Date()) =>
  t.status === "active" && Boolean(t.expiresAt && t.expiresAt > now);

/** Trades this account is part of that aren't finished (pending or live). */
export async function openTradeWith(a: number, b: number): Promise<LinkTrade | undefined> {
  const [row] = await db.select().from(linkTrades).where(and(
    or(eq(linkTrades.status, "pending"), isLive()),
    or(
      and(eq(linkTrades.proposerId, a), eq(linkTrades.partnerId, b)),
      and(eq(linkTrades.proposerId, b), eq(linkTrades.partnerId, a)),
    ),
  ));
  return row;
}

export async function activeTradeCount(userId: number): Promise<number> {
  const rows = await db.select({ id: linkTrades.id }).from(linkTrades).where(and(
    isLive(),
    or(eq(linkTrades.proposerId, userId), eq(linkTrades.partnerId, userId)),
  ));
  return rows.length;
}

/** From one side's point of view: whose link is mine, whose is theirs, and their clicks. */
export function tradeSides(t: LinkTrade, me: number) {
  const mine = t.proposerId === me;
  return {
    mine,
    partnerId: mine ? t.partnerId : t.proposerId,
    // My link, shown on their page
    myTitle: mine ? t.proposerTitle : t.partnerTitle,
    myUrl: mine ? t.proposerUrl : t.partnerUrl,
    // Clicks their page sent to my link
    myClicks: mine ? t.proposerClicks : t.partnerClicks,
    theirTitle: mine ? t.partnerTitle : t.proposerTitle,
    theirUrl: mine ? t.partnerUrl : t.proposerUrl,
    // Clicks my page sent to their link
    theirClicks: mine ? t.partnerClicks : t.proposerClicks,
  };
}

/** The "Link trades" row on a public page: the other side's link from each live trade. */
export async function tradeLinksFor(userId: number): Promise<TradeLink[]> {
  const rows = await db
    .select({ trade: linkTrades, partnerHandle: users.handle, partnerBanned: users.bannedAt })
    .from(linkTrades)
    .innerJoin(users, or(
      and(eq(linkTrades.proposerId, userId), eq(users.id, linkTrades.partnerId)),
      and(eq(linkTrades.partnerId, userId), eq(users.id, linkTrades.proposerId)),
    ))
    .where(and(isLive(), or(eq(linkTrades.proposerId, userId), eq(linkTrades.partnerId, userId))))
    .orderBy(linkTrades.respondedAt);
  return rows
    .filter((r) => !r.partnerBanned)
    .map(({ trade, partnerHandle }) => {
      // On my page I show the partner's link; its side is the opposite of mine
      const side = trade.proposerId === userId ? "b" : "a";
      return {
        id: trade.id,
        side,
        title: (side === "a" ? trade.proposerTitle : trade.partnerTitle) ?? "",
        partnerHandle,
      } as TradeLink;
    })
    .slice(0, MAX_ACTIVE_TRADES);
}

/**
 * 18+ pages only ever see and trade with other 18+ pages, and mainstream pages never see them.
 * A page counts as 18+ when it has the whole-page 18+ screen on or picked "Adult creator".
 */
export const isAdultPage = (u: Pick<User, "adultGate" | "creatorType">) => u.adultGate || u.creatorType === "adult";
const adultSql = sql<boolean>`("users"."adult_gate" or "users"."creator_type" = 'adult')`;

/** Coarse audience size from page views in the last 30 days, so we can match people of similar size without showing exact numbers. */
export const SIZE_TIERS = [
  { min: 10000, label: "10k+ views/mo", icon: "🚀" },
  { min: 1000, label: "1k+ views/mo", icon: "🔥" },
  { min: 100, label: "100+ views/mo", icon: "📈" },
  { min: 0, label: "Just getting started", icon: "🌱" },
] as const;
export const sizeTier = (views: number) => SIZE_TIERS.findIndex((t) => views >= t.min);

export type DirectoryRow = {
  id: number; handle: string; displayName: string; avatarVersion: number; creatorType: string; pitch: string;
  staff: boolean; views30: number; liveTrades: number; tradesDone: number; clicksSent: number; clicksGot: number;
};

// Written with the table name in full: in a single-table select drizzle drops it, and link_trades has an "id" too
const ME = sql.raw(`"users"."id"`);
const statsSql = {
  views30: sql<number>`(select count(*) from events e where e.user_id = ${ME} and e.kind = 'view' and e.created_at > now() - interval '30 days')::int`,
  liveTrades: sql<number>`(select count(*) from link_trades t where (t.proposer_id = ${ME} or t.partner_id = ${ME}) and t.status = 'active' and t.expires_at > now())::int`,
  tradesDone: sql<number>`(select count(*) from link_trades t where (t.proposer_id = ${ME} or t.partner_id = ${ME}) and t.status in ('active', 'ended'))::int`,
  // Clicks this creator's page sent to partners, and clicks partners' pages sent back
  clicksSent: sql<number>`(select coalesce(sum(case when t.proposer_id = ${ME} then t.partner_clicks else t.proposer_clicks end), 0) from link_trades t where t.proposer_id = ${ME} or t.partner_id = ${ME})::int`,
  clicksGot: sql<number>`(select coalesce(sum(case when t.proposer_id = ${ME} then t.proposer_clicks else t.partner_clicks end), 0) from link_trades t where t.proposer_id = ${ME} or t.partner_id = ${ME})::int`,
};

/** Listed creators on the same side of the 18+ line as `me` (never `me`), optionally one category or a search. */
export async function directory(me: Pick<User, "id" | "adultGate" | "creatorType">, opts: { type?: string; q?: string; handle?: string; limit?: number } = {}): Promise<DirectoryRow[]> {
  const q = opts.q?.trim().toLowerCase().replace(/^@/, "");
  const rows = await db
    .select({
      id: users.id, handle: users.handle, displayName: users.displayName, avatarVersion: users.avatarVersion,
      creatorType: users.creatorType, pitch: users.tradezPitch, isAdmin: users.isAdmin, email: users.email, ...statsSql,
    })
    .from(users)
    .where(and(
      eq(users.tradezListed, true), isNull(users.ownerId), isNull(users.bannedAt), sql`not ${notLiveYet}`,
      ne(users.id, me.id),
      isAdultPage(me) ? adultSql : sql`not ${adultSql}`,
      opts.type ? eq(users.creatorType, opts.type) : undefined,
      opts.handle ? eq(users.handle, opts.handle) : undefined,
      q ? or(ilike(users.handle, `%${q}%`), ilike(users.displayName, `%${q}%`), ilike(users.tradezPitch, `%${q}%`)) : undefined,
    ))
    .orderBy(desc(sql`${statsSql.views30}`), desc(users.createdAt))
    .limit(opts.limit ?? 60);
  return rows.map(({ isAdmin: admin, email, ...r }) => ({ ...r, staff: isAdmin({ isAdmin: admin, email }) }));
}

/** My own numbers, for the "Your listing" box. */
export async function myStats(id: number) {
  const [row] = await db.select(statsSql).from(users).where(eq(users.id, id));
  return row;
}

/**
 * Suggested matches: same category, similar audience size (same or next tier), no trade already going.
 * Falls back to similar size in any category when the category is quiet.
 */
export function suggestMatches(me: { creatorType: string; views30: number }, rows: DirectoryRow[], busyWith: Set<number>, n = 3): DirectoryRow[] {
  const mine = sizeTier(me.views30);
  const near = (r: DirectoryRow) => Math.abs(sizeTier(r.views30) - mine) <= 1;
  const open = rows.filter((r) => !busyWith.has(r.id) && r.liveTrades < MAX_ACTIVE_TRADES && near(r));
  const same = open.filter((r) => me.creatorType && r.creatorType === me.creatorType);
  const rest = open.filter((r) => !same.includes(r));
  return [...same, ...rest].slice(0, n);
}

/** Who I already have a pending or live trade with, and how many requests are waiting on me. */
export async function myTradeState(me: number) {
  const rows = await db
    .select({ proposerId: linkTrades.proposerId, partnerId: linkTrades.partnerId, status: linkTrades.status, expiresAt: linkTrades.expiresAt })
    .from(linkTrades)
    .where(and(or(eq(linkTrades.proposerId, me), eq(linkTrades.partnerId, me)), or(eq(linkTrades.status, "pending"), isLive())));
  const status = new Map<number, "pending" | "live">();
  let incoming = 0;
  for (const r of rows) {
    const other = r.proposerId === me ? r.partnerId : r.proposerId;
    status.set(other, r.status === "pending" ? "pending" : "live");
    if (r.status === "pending" && r.partnerId === me) incoming++;
  }
  const live = [...status.values()].filter((s) => s === "live").length;
  return { status, incoming, live };
}
