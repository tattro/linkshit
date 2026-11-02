"use server";

import { and, asc, eq, isNull, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { avatars, backgrounds, db, linkThumbs, links, sessions, users } from "@/db";
import { getSession, MAX_PAGES } from "@/lib/auth";
import { domainsEnabled, removeProjectDomain } from "@/lib/domains";
import { handleTaken } from "@/lib/handleTaken";
import { handleProblem, normalizeHandle } from "@/lib/handles";
import { rateLimit, TOO_MANY } from "@/lib/ratelimit";

export type PageState = { error?: string } | undefined;

/** Adds another page to the account and switches the dashboard to it. */
export async function createPage(_prev: PageState, formData: FormData): Promise<PageState> {
  const s = await getSession();
  if (!s) redirect("/login");
  const account = s.account;
  const handle = normalizeHandle(String(formData.get("handle") ?? ""));
  const problem = handleProblem(handle);
  if (problem) return { error: problem };
  const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(users).where(eq(users.ownerId, account.id));
  if (n + 1 >= MAX_PAGES) return { error: `${MAX_PAGES} pages max. Delete one first.` };
  if (!(await rateLimit(`newpage:user:${account.id}`, 10, 24 * 60 * 60))) return { error: TOO_MANY };
  if (await handleTaken(handle)) return { error: `Someone already claimed linksh.it/${handle}.` };
  const from = formData.get("copy") === "on" ? s.page : null;
  let page: { id: number };
  try {
    [page] = await db
      .insert(users)
      .values({
        ownerId: account.id, handle, displayName: handle, emailVerifiedAt: account.emailVerifiedAt,
        // "Copy this page": everything that makes the page look and behave the same.
        // Never the custom domain, stats, subscribers or redirect mode.
        ...(from && {
          displayName: from.displayName, bio: from.bio, theme: from.theme, style: from.style, socials: from.socials,
          tips: from.tips, openInApp: from.openInApp, signupEnabled: from.signupEnabled, signupPrompt: from.signupPrompt, contactEnabled: from.contactEnabled, qaEnabled: from.qaEnabled, qaPrompt: from.qaPrompt, creatorType: from.creatorType,
          lockCode: from.lockCode, seoTitle: from.seoTitle, seoDescription: from.seoDescription,
          metaPixel: from.metaPixel, googleAnalytics: from.googleAnalytics, tiktokPixel: from.tiktokPixel, utm: from.utm,
          avatarVersion: from.avatarVersion, bgVersion: from.bgVersion,
        }),
      })
      .returning({ id: users.id });
  } catch {
    return { error: "That handle was just taken. Try another." };
  }
  if (from) await copyPageContent(from.id, page.id);
  await db.update(sessions).set({ activePageId: page.id }).where(eq(sessions.id, s.sessionId));
  redirect("/dashboard?newpage=1");
}

/** Points the dashboard at a different page on the same account. */
export async function switchPage(formData: FormData) {
  const s = await getSession();
  if (!s) redirect("/login");
  const id = Number(formData.get("id"));
  const days = Number(formData.get("days"));
  const back = formData.get("to") === "analytics"
    ? `/dashboard/analytics${[7, 30, 90, 365].includes(days) ? `?days=${days}` : ""}`
    : "/dashboard";
  if (id === s.account.id) {
    await db.update(sessions).set({ activePageId: null }).where(eq(sessions.id, s.sessionId));
  } else {
    const [page] = await db.select({ id: users.id }).from(users).where(and(eq(users.id, id), eq(users.ownerId, s.account.id)));
    if (page) await db.update(sessions).set({ activePageId: page.id }).where(eq(sessions.id, s.sessionId));
  }
  redirect(back);
}

/** Deletes one extra page (never the main one; that's what deleting the account is for). */
export async function deletePage(_prev: PageState, formData: FormData): Promise<PageState> {
  const s = await getSession();
  if (!s) redirect("/login");
  const page = s.page;
  if (page.id === s.account.id) return { error: "That's your main page. Delete the account instead." };
  if (String(formData.get("handle") ?? "").trim().toLowerCase().replace(/^@/, "") !== page.handle) {
    return { error: `Type ${page.handle} to confirm.` };
  }
  if (page.customDomain && domainsEnabled()) await removeProjectDomain(page.customDomain);
  await db.delete(users).where(and(eq(users.id, page.id), eq(users.ownerId, s.account.id)));
  redirect("/dashboard?pagegone=1");
}


/** Copies photos and live links (with thumbnails) from one page to a fresh one. Marketplace offers stay behind. */
async function copyPageContent(fromId: number, toId: number) {
  const [avatar] = await db.select().from(avatars).where(eq(avatars.userId, fromId));
  if (avatar) await db.insert(avatars).values({ ...avatar, userId: toId });
  const [bg] = await db.select().from(backgrounds).where(eq(backgrounds.userId, fromId));
  if (bg) await db.insert(backgrounds).values({ ...bg, userId: toId });
  const rows = await db.select().from(links)
    .where(and(eq(links.userId, fromId), isNull(links.deletedAt), isNull(links.offerId)))
    .orderBy(asc(links.position), asc(links.id));
  for (const { id, ...rest } of rows) {
    const [copy] = await db.insert(links).values({ ...rest, userId: toId, clicks: 0, createdAt: new Date() }).returning({ id: links.id });
    if (rest.thumbVersion > 0) {
      const [thumb] = await db.select().from(linkThumbs).where(eq(linkThumbs.linkId, id));
      if (thumb) await db.insert(linkThumbs).values({ ...thumb, linkId: copy.id });
    }
  }
}
