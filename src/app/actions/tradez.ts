"use server";

import { and, eq, isNull, or } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db, linkTrades, users, type LinkTrade } from "@/db";
import { rateLimit, TOO_MANY } from "@/lib/ratelimit";
import { unsafeReason } from "@/lib/safety";
import {
  activeTradeCount, isAdultPage, MAX_ACTIVE_TRADES, TRADE_DURATIONS, tradeIsLive, MAX_NOTE, MAX_PITCH, MAX_TRADE_TITLE, openTradeWith, requireTradezAccount,
} from "@/lib/tradez";
import { normalizeUrl } from "@/lib/urls";

const TRADES = "/dashboard/tradez/trades";

/** Back to a page with a one-line message on it (?ok= or ?err=). */
function flash(path: string, kind: "ok" | "err", msg: string): never {
  const sep = path.includes("?") ? "&" : "?";
  redirect(`${path}${sep}${kind}=${encodeURIComponent(msg)}`);
}

async function refreshPages(...ids: number[]) {
  revalidatePath("/dashboard/tradez", "layout");
  const rows = await db.select({ handle: users.handle }).from(users).where(or(...ids.map((id) => eq(users.id, id))));
  for (const r of rows) revalidatePath(`/${r.handle}`);
}

/** Title + URL from a form, checked like any other link. */
async function readLink(formData: FormData): Promise<{ title: string; url: string } | { error: string }> {
  const title = String(formData.get("title") ?? "").trim().slice(0, MAX_TRADE_TITLE);
  const url = normalizeUrl(String(formData.get("url") ?? ""));
  if (!title) return { error: "Give your link a name." };
  if (!url || url.startsWith("mailto:")) return { error: "That doesn't look like a web address." };
  const bad = await unsafeReason(url);
  if (bad) return { error: bad };
  return { title, url };
}

/** Turns your directory listing on or off and sets your one-line pitch. */
export async function updateListing(formData: FormData) {
  const me = await requireTradezAccount();
  await db.update(users).set({
    tradezListed: formData.get("listed") === "on",
    tradezPitch: String(formData.get("pitch") ?? "").trim().slice(0, MAX_PITCH),
  }).where(eq(users.id, me.id));
  revalidatePath("/dashboard/tradez", "layout");
  flash("/dashboard/tradez", "ok", formData.get("listed") === "on" ? "You're in the directory." : "You're hidden from the directory.");
}

/** Sends a trade request. Sending it is the proposer's "I agree". */
export async function proposeTrade(formData: FormData) {
  const me = await requireTradezAccount();
  const handle = String(formData.get("handle") ?? "");
  const back = `/dashboard/tradez/request/${encodeURIComponent(handle)}`;
  if (!(await rateLimit(`trade:propose:${me.id}`, 20, 24 * 60 * 60))) flash(back, "err", TOO_MANY);

  const [partner] = await db.select({ id: users.id, adultGate: users.adultGate, creatorType: users.creatorType }).from(users).where(and(
    eq(users.handle, handle), isNull(users.ownerId), isNull(users.bannedAt), eq(users.tradezListed, true),
  ));
  if (!partner) flash("/dashboard/tradez", "err", "That creator isn't taking trades right now.");
  if (partner.id === me.id) flash("/dashboard/tradez", "err", "Trading with yourself? Bold. Not allowed though.");
  // 18+ pages only trade with 18+ pages
  if (isAdultPage(partner) !== isAdultPage(me)) flash("/dashboard/tradez", "err", "That creator isn't taking trades right now.");
  if (await openTradeWith(me.id, partner.id)) flash(TRADES, "err", `You already have a trade going with @${handle}.`);
  if ((await activeTradeCount(me.id)) >= MAX_ACTIVE_TRADES) {
    flash(back, "err", `You already have ${MAX_ACTIVE_TRADES} live trades. End one first.`);
  }

  const link = await readLink(formData);
  if ("error" in link) flash(back, "err", link.error);
  const note = String(formData.get("note") ?? "").trim().slice(0, MAX_NOTE);
  const days = Number(formData.get("days"));
  const durationDays = (TRADE_DURATIONS as readonly number[]).includes(days) ? days : 14;
  await db.insert(linkTrades).values({ proposerId: me.id, partnerId: partner.id, proposerTitle: link.title, proposerUrl: link.url, note, durationDays });
  revalidatePath("/dashboard/tradez", "layout");
  flash(TRADES, "ok", `Trade request sent to @${handle}. Fingers crossed.`);
}

async function myTrade(id: number, meId: number): Promise<LinkTrade | undefined> {
  const [t] = await db.select().from(linkTrades).where(and(
    eq(linkTrades.id, id), or(eq(linkTrades.proposerId, meId), eq(linkTrades.partnerId, meId)),
  ));
  return t;
}

/** The partner's "I agree": they pick the link that goes on the proposer's page and the trade goes live. */
export async function acceptTrade(formData: FormData) {
  const me = await requireTradezAccount();
  const t = await myTrade(Number(formData.get("id")), me.id);
  if (!t || t.partnerId !== me.id || t.status !== "pending") flash(TRADES, "err", "That request is gone.");
  const [proposer] = await db.select({ adultGate: users.adultGate, creatorType: users.creatorType }).from(users).where(eq(users.id, t.proposerId));
  if (!proposer || isAdultPage(proposer) !== isAdultPage(me)) flash(TRADES, "err", "18+ pages and everyone-else pages can't trade with each other.");
  if ((await activeTradeCount(me.id)) >= MAX_ACTIVE_TRADES) flash(TRADES, "err", `You already have ${MAX_ACTIVE_TRADES} live trades. End one first.`);
  if ((await activeTradeCount(t.proposerId)) >= MAX_ACTIVE_TRADES) flash(TRADES, "err", "Their trade spots filled up since they asked. Try again later.");
  const link = await readLink(formData);
  if ("error" in link) flash(TRADES, "err", link.error);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + t.durationDays * 24 * 60 * 60 * 1000);
  await db.update(linkTrades)
    .set({ status: "active", partnerTitle: link.title, partnerUrl: link.url, respondedAt: now, expiresAt })
    .where(and(eq(linkTrades.id, t.id), eq(linkTrades.status, "pending")));
  await refreshPages(t.proposerId, t.partnerId);
  flash(TRADES, "ok", "Deal! Both links are live at the bottom of your pages.");
}

/** Says no to a request, or (proposer) takes it back. */
export async function declineTrade(formData: FormData) {
  const me = await requireTradezAccount();
  const t = await myTrade(Number(formData.get("id")), me.id);
  if (!t || t.status !== "pending") flash(TRADES, "err", "That request is gone.");
  await db.update(linkTrades).set({ status: "declined", respondedAt: new Date() }).where(eq(linkTrades.id, t.id));
  revalidatePath("/dashboard/tradez", "layout");
  flash(TRADES, "ok", t.proposerId === me.id ? "Request withdrawn." : "Declined. No hard feelings.");
}

/** Either side can end a live trade any time; both links come off both pages. */
export async function endTrade(formData: FormData) {
  const me = await requireTradezAccount();
  const t = await myTrade(Number(formData.get("id")), me.id);
  if (!t || !tradeIsLive(t)) flash(TRADES, "err", "That trade already ended.");
  await db.update(linkTrades)
    .set({ status: "ended", endedAt: new Date(), changeBy: null, changeTitle: null, changeUrl: null })
    .where(eq(linkTrades.id, t.id));
  await refreshPages(t.proposerId, t.partnerId);
  flash(TRADES, "ok", "Trade ended. Both links are off both pages.");
}

/** Live trade links are locked: changing yours asks the other side to approve it. */
export async function requestTradeChange(formData: FormData) {
  const me = await requireTradezAccount();
  const t = await myTrade(Number(formData.get("id")), me.id);
  if (!t || !tradeIsLive(t)) flash(TRADES, "err", "That trade isn't live.");
  if (t.changeBy && t.changeBy !== me.id) flash(TRADES, "err", "They asked for a change first. Answer that one before asking for yours.");
  const link = await readLink(formData);
  if ("error" in link) flash(TRADES, "err", link.error);
  await db.update(linkTrades).set({ changeBy: me.id, changeTitle: link.title, changeUrl: link.url }).where(eq(linkTrades.id, t.id));
  revalidatePath("/dashboard/tradez", "layout");
  flash(TRADES, "ok", "Change sent. It goes live when they approve it.");
}

/** Approves or rejects the other side's change, or withdraws your own. */
export async function answerTradeChange(formData: FormData) {
  const me = await requireTradezAccount();
  const t = await myTrade(Number(formData.get("id")), me.id);
  if (!t || !tradeIsLive(t) || !t.changeBy || !t.changeTitle || !t.changeUrl) flash(TRADES, "err", "That change is gone.");
  const approve = formData.get("approve") === "1" && t.changeBy !== me.id;
  const clear = { changeBy: null, changeTitle: null, changeUrl: null };
  if (approve) {
    const side = t.changeBy === t.proposerId
      ? { proposerTitle: t.changeTitle, proposerUrl: t.changeUrl, proposerClicks: 0 }
      : { partnerTitle: t.changeTitle, partnerUrl: t.changeUrl, partnerClicks: 0 };
    await db.update(linkTrades).set({ ...side, ...clear }).where(eq(linkTrades.id, t.id));
    await refreshPages(t.proposerId, t.partnerId);
    flash(TRADES, "ok", "Change approved and live.");
  }
  await db.update(linkTrades).set(clear).where(eq(linkTrades.id, t.id));
  revalidatePath("/dashboard/tradez", "layout");
  flash(TRADES, "ok", t.changeBy === me.id ? "Change withdrawn." : "Change rejected. The old link stays.");
}
