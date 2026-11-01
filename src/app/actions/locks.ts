"use server";

import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { db, links, users } from "@/db";
import { LOCK_MAX_AGE, lockCookie, lockToken, sameCode, type LockKind } from "@/lib/locks";
import { rateLimit, TOO_MANY } from "@/lib/ratelimit";
import { clientIp } from "@/lib/request";

export type UnlockState = { error?: string; ok?: boolean } | undefined;

/** Checks a visitor's code for a locked page and, if right, remembers it in a cookie. */
export async function unlock(_prev: UnlockState, formData: FormData): Promise<UnlockState> {
  const kind: LockKind = formData.get("kind") === "link" ? "link" : "page";
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) return { error: "Something went wrong. Reload and try again." };
  if (!(await rateLimit(`unlock:${kind}:${id}:${await clientIp()}`, 10, 10 * 60))) return { error: TOO_MANY };
  const [row] = kind === "page"
    ? await db.select({ code: users.lockCode }).from(users).where(eq(users.id, id))
    : await db.select({ code: links.lockCode }).from(links).where(eq(links.id, id));
  if (!row?.code) return { ok: true };
  if (!sameCode(String(formData.get("code") ?? ""), row.code)) return { error: "Wrong code. Try again." };
  (await cookies()).set(lockCookie(kind, id), lockToken(kind, id, row.code), {
    httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge: LOCK_MAX_AGE, path: "/",
  });
  return { ok: true };
}
