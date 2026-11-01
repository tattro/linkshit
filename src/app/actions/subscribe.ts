"use server";

import { and, eq, isNull } from "drizzle-orm";
import { db, subscribers, users } from "@/db";
import { rateLimit } from "@/lib/ratelimit";
import { clientIp } from "@/lib/request";

export type SubscribeState = { ok?: boolean; error?: string } | undefined;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Public: a visitor joins a page owner's email list. */
export async function subscribe(_prev: SubscribeState, formData: FormData): Promise<SubscribeState> {
  if (String(formData.get("company") ?? "")) return { ok: true }; // honeypot: pretend it worked
  const userId = Number(formData.get("userId"));
  const email = String(formData.get("email") ?? "").trim().toLowerCase().slice(0, 254);
  if (!Number.isInteger(userId) || userId <= 0) return { error: "Something went wrong." };
  if (!EMAIL.test(email)) return { error: "That email doesn't look right." };
  const ip = await clientIp();
  if (!(await rateLimit(`subscribe:ip:${ip}`, 10, 60 * 60))) return { error: "Slow down a bit and try again later." };
  const [owner] = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.id, userId), eq(users.signupEnabled, true), isNull(users.bannedAt)));
  if (!owner) return { error: "This list isn't taking signups right now." };
  await db.insert(subscribers).values({ userId, email }).onConflictDoNothing();
  return { ok: true };
}
