"use server";

import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db, users } from "@/db";
import { destroySession, requireUser } from "@/lib/auth";
import { domainsEnabled, removeProjectDomain } from "@/lib/domains";
import { rateLimit, TOO_MANY } from "@/lib/ratelimit";

export type DeleteState = { error?: string } | undefined;

/** Deletes the account and everything in it (links, analytics, photos, subscribers). */
export async function deleteAccount(_prev: DeleteState, formData: FormData): Promise<DeleteState> {
  const user = await requireUser();
  if (!(await rateLimit(`delete:user:${user.id}`, 5, 60 * 60))) return { error: TOO_MANY };
  if (String(formData.get("handle") ?? "").trim().toLowerCase().replace(/^@/, "") !== user.handle) {
    return { error: `Type ${user.handle} to confirm.` };
  }
  if (!(await bcrypt.compare(String(formData.get("password") ?? ""), user.passwordHash))) {
    return { error: "Wrong password." };
  }
  if (user.customDomain && domainsEnabled()) await removeProjectDomain(user.customDomain);
  await destroySession();
  await db.delete(users).where(eq(users.id, user.id)); // everything else cascades
  redirect("/?bye=1");
}
