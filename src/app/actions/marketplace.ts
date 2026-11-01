"use server";

import { and, eq, isNull, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db, links, offerRequests, offers, users } from "@/db";
import { requireAccount, requireAdmin, requireUser } from "@/lib/auth";
import { buttonEmail, sendEmail } from "@/lib/email";
import { siteUrl } from "@/lib/request";

/** "Let advertisers reach out to me": off unless the creator ticks it. */
export async function setAdvertiserOptIn(formData: FormData) {
  const account = await requireAccount();
  const on = formData.get("optIn") === "on";
  await db.update(users).set({ marketplaceInterestAt: on ? (account.marketplaceInterestAt ?? new Date()) : null }).where(eq(users.id, account.id));
  revalidatePath("/dashboard");
}

const MAX_LINKS = 100;

/** Puts an offer on a page as a link at the very bottom. Returns false if the page is full. */
async function placeOffer(page: { id: number; handle: string }, offer: typeof offers.$inferSelect) {
  const [existing] = await db.select({ id: links.id }).from(links)
    .where(and(eq(links.userId, page.id), eq(links.offerId, offer.id), isNull(links.deletedAt)));
  if (existing) return true;
  const [{ live, maxPos }] = await db
    .select({ live: sql<number>`count(*)::int`, maxPos: sql<number>`coalesce(max(${links.position}), -1)::int` })
    .from(links).where(and(eq(links.userId, page.id), isNull(links.deletedAt)));
  if (live >= MAX_LINKS) return false;
  const url = offer.url.replaceAll("{handle}", encodeURIComponent(page.handle)).replaceAll("{uid}", String(page.id));
  await db.insert(links).values({ userId: page.id, title: offer.title, url, icon: offer.icon, offerId: offer.id, position: maxPos + 1 });
  revalidatePath(`/${page.handle}`);
  return true;
}

/** "I want this": instant for auto-approve offers, otherwise a request for approval. */
export async function addOffer(formData: FormData) {
  const user = await requireUser();
  const offerId = Number(formData.get("offerId"));
  if (!Number.isInteger(offerId)) return;
  const [offer] = await db.select().from(offers).where(and(eq(offers.id, offerId), eq(offers.active, true)));
  if (!offer) return;
  if (offer.autoApprove) {
    await placeOffer(user, offer);
  } else {
    await db.insert(offerRequests).values({ offerId, userId: user.id })
      .onConflictDoUpdate({
        target: [offerRequests.offerId, offerRequests.userId],
        set: { status: "pending", createdAt: new Date(), decidedAt: null },
        setWhere: sql`${offerRequests.status} <> 'approved'`,
      });
    // Approved before and just removed it? Put it straight back.
    const [req] = await db.select({ status: offerRequests.status }).from(offerRequests)
      .where(and(eq(offerRequests.offerId, offerId), eq(offerRequests.userId, user.id)));
    if (req?.status === "approved") await placeOffer(user, offer);
  }
  revalidatePath("/dashboard/marketplace");
  revalidatePath("/dashboard");
}

/** Takes an offer back off the current page (into the graveyard, like any link). */
export async function removeOffer(formData: FormData) {
  const user = await requireUser();
  const offerId = Number(formData.get("offerId"));
  if (!Number.isInteger(offerId)) return;
  await db.update(links).set({ deletedAt: new Date() })
    .where(and(eq(links.userId, user.id), eq(links.offerId, offerId), isNull(links.deletedAt)));
  revalidatePath("/dashboard/marketplace");
  revalidatePath("/dashboard");
  revalidatePath(`/${user.handle}`);
}

// ---- Admin ----

const field = (fd: FormData, k: string, max: number) => String(fd.get(k) ?? "").trim().slice(0, max);

export type OfferState = { error?: string; ok?: boolean } | undefined;

export async function createOffer(_prev: OfferState, formData: FormData): Promise<OfferState> {
  await requireAdmin();
  const title = field(formData, "title", 100);
  const advertiser = field(formData, "advertiser", 80);
  const url = field(formData, "url", 2000);
  if (!title || !advertiser) return { error: "Title and advertiser are required." };
  try {
    const u = new URL(url.replaceAll("{handle}", "x").replaceAll("{uid}", "1"));
    if (u.protocol !== "https:" && u.protocol !== "http:") throw new Error();
  } catch {
    return { error: "That tracking URL doesn't look right." };
  }
  await db.insert(offers).values({
    title, advertiser, url,
    description: field(formData, "description", 300),
    payout: field(formData, "payout", 60),
    category: field(formData, "category", 40),
    icon: [...field(formData, "icon", 16)].slice(0, 2).join(""),
    autoApprove: formData.get("autoApprove") === "on",
  });
  revalidatePath("/admin");
  revalidatePath("/dashboard/marketplace");
  return { ok: true };
}

export async function setOfferAutoApprove(formData: FormData) {
  await requireAdmin();
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) return;
  await db.update(offers).set({ autoApprove: formData.get("auto") === "1" }).where(eq(offers.id, id));
  revalidatePath("/admin");
}

export async function setOfferActive(formData: FormData) {
  await requireAdmin();
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) return;
  await db.update(offers).set({ active: formData.get("active") === "1" }).where(eq(offers.id, id));
  revalidatePath("/admin");
  revalidatePath("/dashboard/marketplace");
}

/** Approve or decline a creator's request for an offer that needs approval. */
export async function decideOfferRequest(formData: FormData) {
  await requireAdmin();
  const id = Number(formData.get("id"));
  const approve = formData.get("approve") === "1";
  if (!Number.isInteger(id)) return;
  const [req] = await db
    .select({ offer: offers, page: { id: users.id, handle: users.handle, ownerId: users.ownerId, email: users.email } })
    .from(offerRequests)
    .innerJoin(offers, eq(offers.id, offerRequests.offerId))
    .innerJoin(users, eq(users.id, offerRequests.userId))
    .where(and(eq(offerRequests.id, id), eq(offerRequests.status, "pending")));
  if (!req) return;
  await db.update(offerRequests).set({ status: approve ? "approved" : "declined", decidedAt: new Date() }).where(eq(offerRequests.id, id));
  if (approve) await placeOffer(req.page, req.offer);

  // Let the creator know (the email lives on the account that owns the page)
  const [acct] = req.page.ownerId
    ? await db.select({ email: users.email }).from(users).where(eq(users.id, req.page.ownerId))
    : [{ email: req.page.email }];
  if (acct?.email) {
    const base = await siteUrl();
    const { text, html } = approve
      ? buttonEmail(
          `You're approved for ${req.offer.advertiser} 🎉`,
          `"${req.offer.title}" is now live at the bottom of linksh.it/${req.page.handle}, with the affiliate disclaimer. Every signup or sale through it earns you a commission.`,
          "See it in your dashboard", `${base}/dashboard/marketplace`,
        )
      : buttonEmail(
          `${req.offer.advertiser} passed this time`,
          `Your request for "${req.offer.title}" wasn't approved. No hard feelings: there are other offers in the Marketplace.`,
          "Browse offers", `${base}/dashboard/marketplace`,
        );
    await sendEmail(acct.email, approve ? `Approved: ${req.offer.advertiser} is on your page 💸` : `Update on your ${req.offer.advertiser} request`, text, html);
  }
  revalidatePath("/admin");
}
