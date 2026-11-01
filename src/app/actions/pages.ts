"use server";

import { and, eq, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db, sessions, users } from "@/db";
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
  let page: { id: number };
  try {
    [page] = await db
      .insert(users)
      .values({ ownerId: account.id, handle, displayName: handle, emailVerifiedAt: account.emailVerifiedAt })
      .returning({ id: users.id });
  } catch {
    return { error: "That handle was just taken. Try another." };
  }
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

