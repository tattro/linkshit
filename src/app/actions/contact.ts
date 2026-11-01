"use server";

import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db, messages, users } from "@/db";
import { requireUser } from "@/lib/auth";
import { esc, sendEmail } from "@/lib/email";
import { rateLimit } from "@/lib/ratelimit";
import { clientIp, siteUrl } from "@/lib/request";

export type ContactState = { ok?: boolean; error?: string } | undefined;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MAX_BODY = 1000;

/** Public: a visitor sends the page owner a message. Their email is never shown to them. */
export async function sendMessage(_prev: ContactState, formData: FormData): Promise<ContactState> {
  if (String(formData.get("company") ?? "")) return { ok: true }; // honeypot: pretend it worked
  const userId = Number(formData.get("userId"));
  const name = String(formData.get("name") ?? "").trim().replace(/\s+/g, " ").slice(0, 60);
  const email = String(formData.get("email") ?? "").trim().toLowerCase().slice(0, 254);
  const body = String(formData.get("body") ?? "").trim().slice(0, MAX_BODY);
  if (!Number.isInteger(userId) || userId <= 0) return { error: "Something went wrong." };
  if (!EMAIL.test(email)) return { error: "That email doesn't look right. They need it to write back." };
  if (body.length < 2) return { error: "Say something first." };
  const ip = await clientIp();
  if (!(await rateLimit(`contact:ip:${ip}`, 5, 60 * 60))) return { error: "Slow down a bit and try again later." };
  if (!(await rateLimit(`contact:page:${userId}`, 50, 24 * 60 * 60))) return { error: "This inbox is full for today. Try tomorrow." };

  const [page] = await db
    .select({ id: users.id, handle: users.handle, ownerId: users.ownerId, email: users.email })
    .from(users)
    .where(and(eq(users.id, userId), eq(users.contactEnabled, true), isNull(users.bannedAt)));
  if (!page) return { error: "This page isn't taking messages right now." };
  await db.insert(messages).values({ userId, name, email, body });

  // Extra pages have no email of their own; the account that owns them gets the message
  const [owner] = page.ownerId
    ? await db.select({ email: users.email }).from(users).where(eq(users.id, page.ownerId))
    : [{ email: page.email }];
  if (owner?.email) {
    const from = name ? `${name} (${email})` : email;
    const dashboard = `${await siteUrl()}/dashboard`;
    const text = `New message on linksh.it/${page.handle} from ${from}:\n\n${body}\n\nHit reply to answer them.\n\nAll messages: ${dashboard}`;
    const html = `<div style="font-family:system-ui,sans-serif;max-width:480px;margin:auto;padding:24px;color:#1c1917">
<p style="font-family:monospace;font-size:20px;font-weight:700">linksh<span style="color:#84cc16">.</span>it</p>
<h1 style="font-size:20px">📬 New message on linksh.it/${esc(page.handle)}</h1>
<p style="color:#78716c">From ${esc(from)}</p>
<p style="white-space:pre-wrap;border-left:4px solid #84cc16;padding-left:12px">${esc(body)}</p>
<p>Hit reply to answer them. <a href="${esc(dashboard)}">All messages</a></p></div>`;
    await sendEmail(owner.email, `📬 Message from ${name || email} on linksh.it/${page.handle}`, text, html, undefined, email);
  }
  return { ok: true };
}

/** Turns the contact form on or off for the current page. */
export async function updateContact(_prev: ContactState, formData: FormData): Promise<ContactState> {
  const user = await requireUser();
  await db.update(users).set({ contactEnabled: formData.get("contactEnabled") === "on" }).where(eq(users.id, user.id));
  revalidatePath("/dashboard");
  revalidatePath(`/${user.handle}`);
  return { ok: true };
}

/** Deletes one message from the current page's inbox. */
export async function deleteMessage(formData: FormData) {
  const user = await requireUser();
  await db.delete(messages).where(and(eq(messages.id, Number(formData.get("id"))), eq(messages.userId, user.id)));
  revalidatePath("/dashboard");
}
