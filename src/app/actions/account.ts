"use server";

import bcrypt from "bcryptjs";
import { eq, or } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db, users } from "@/db";
import { destroySession, requireAccount } from "@/lib/auth";
import { domainsEnabled, removeProjectDomain } from "@/lib/domains";
import { rateLimit, TOO_MANY } from "@/lib/ratelimit";

export type DeleteState = { error?: string } | undefined;

/** Deletes the account, all its pages, and everything in them (links, analytics, photos, subscribers). */
export async function deleteAccount(_prev: DeleteState, formData: FormData): Promise<DeleteState> {
  const user = await requireAccount();
  if (!(await rateLimit(`delete:user:${user.id}`, 5, 60 * 60))) return { error: TOO_MANY };
  if (String(formData.get("handle") ?? "").trim().toLowerCase().replace(/^@/, "") !== user.handle) {
    return { error: `Type ${user.handle} to confirm.` };
  }
  if (!user.passwordHash || !(await bcrypt.compare(String(formData.get("password") ?? ""), user.passwordHash))) {
    return { error: "Wrong password." };
  }
  if (domainsEnabled()) {
    const pages = await db.select({ domain: users.customDomain }).from(users).where(or(eq(users.id, user.id), eq(users.ownerId, user.id)));
    for (const p of pages) if (p.domain) await removeProjectDomain(p.domain);
  }
  await destroySession();
  await db.delete(users).where(eq(users.id, user.id)); // extra pages and everything else cascade
  redirect("/?bye=1");
}
