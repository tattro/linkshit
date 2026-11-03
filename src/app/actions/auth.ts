"use server";

import bcrypt from "bcryptjs";
import { and, eq, ne } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db, sessions, users } from "@/db";
import {
  consumeEmailToken, createSession, destroySession, getSession, requireAccount, sendResetEmail, sendVerificationEmail,
} from "@/lib/auth";
import { handleProblem, normalizeHandle } from "@/lib/handles";
import { handleTaken } from "@/lib/handleTaken";
import { rateLimit, TOO_MANY } from "@/lib/ratelimit";
import { clientIp } from "@/lib/request";

export type FormState = { error?: string; ok?: string; fields?: Record<string, string> } | undefined;

const emailSchema = z.string().trim().toLowerCase().email("That email looks off.").max(200);
const passwordSchema = z.string().min(8, "Passwords need at least 8 characters.").max(200);

export async function signup(_prev: FormState, formData: FormData): Promise<FormState> {
  const raw = {
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
    handle: String(formData.get("handle") ?? ""),
  };
  const fields = { email: raw.email, handle: raw.handle, marketing: formData.get("marketing") === "on" ? "on" : "" };
  if (String(formData.get("website") ?? "")) return { error: "Nice try, robot.", fields }; // honeypot

  const parsed = z.object({ email: emailSchema, password: passwordSchema }).safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0].message, fields };

  const handle = normalizeHandle(raw.handle);
  const problem = handleProblem(handle);
  if (problem) return { error: problem, fields };

  if (!(await rateLimit(`signup:ip:${await clientIp()}`, 5, 60 * 60))) return { error: TOO_MANY, fields };

  const [emailTaken] = await db.select({ id: users.id }).from(users).where(eq(users.email, parsed.data.email));
  if (emailTaken) return { error: "There's already an account with that email. Log in instead?", fields };
  if (await handleTaken(handle)) return { error: `Someone already claimed linksh.it/${handle}.`, fields };

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  let user: { id: number; email: string | null; handle: string };
  try {
    [user] = await db
      .insert(users)
      .values({
        email: parsed.data.email, passwordHash, handle, displayName: handle,
        marketingOptInAt: formData.get("marketing") === "on" ? new Date() : null,
      })
      .returning({ id: users.id, email: users.email, handle: users.handle });
  } catch {
    // Unique index race: someone grabbed it between the check and the insert
    return { error: "That handle or email was just taken. Try again.", fields };
  }

  await sendVerificationEmail(user);
  await createSession(user.id);
  redirect("/dashboard/welcome");
}

export async function login(_prev: FormState, formData: FormData): Promise<FormState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const ip = await clientIp();
  if (!(await rateLimit(`login:ip:${ip}`, 30, 15 * 60)) || !(await rateLimit(`login:email:${email}`, 10, 15 * 60))) {
    return { error: TOO_MANY, fields: { email } };
  }
  const [user] = await db.select().from(users).where(eq(users.email, email));
  const ok = user?.passwordHash ? await bcrypt.compare(password, user.passwordHash) : false;
  if (!user || !ok) return { error: "Wrong email or password.", fields: { email } };
  if (user.bannedAt) return { error: "This account has been suspended.", fields: { email } };
  await createSession(user.id);
  redirect("/dashboard");
}

export async function logout() {
  await destroySession();
  redirect("/");
}

export async function requestPasswordReset(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = emailSchema.safeParse(formData.get("email"));
  if (!parsed.success) return { error: "That email looks off." };
  const email = parsed.data;
  if (!(await rateLimit(`reset:ip:${await clientIp()}`, 10, 60 * 60)) || !(await rateLimit(`reset:email:${email}`, 3, 60 * 60))) {
    return { error: TOO_MANY, fields: { email } };
  }
  const [user] = await db.select().from(users).where(eq(users.email, email));
  if (user && !user.bannedAt) await sendResetEmail(user);
  // Same answer either way, so this can't be used to find out who has an account
  return { ok: "If that email has an account, a reset link is on its way. Check spam too. Sh.it happens." };
}

export async function resetPassword(_prev: FormState, formData: FormData): Promise<FormState> {
  const token = String(formData.get("token") ?? "");
  const parsed = passwordSchema.safeParse(formData.get("password"));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  if (parsed.data !== formData.get("confirm")) return { error: "Those passwords don't match." };
  const userId = await consumeEmailToken(token, "reset");
  if (!userId) return { error: "That link already got flushed (expired or used). Request a new one." };
  const passwordHash = await bcrypt.hash(parsed.data, 12);
  // Resetting proves they own the inbox, so count it as verified too
  await db.update(users).set({ passwordHash, emailVerifiedAt: new Date() }).where(eq(users.id, userId));
  await db.delete(sessions).where(eq(sessions.userId, userId)); // sign out everywhere else
  await createSession(userId);
  redirect("/dashboard?reset=1");
}

export async function resendVerification(): Promise<FormState> {
  const user = await requireAccount();
  if (user.emailVerifiedAt) return { ok: "You're already verified." };
  if (!(await rateLimit(`verify:user:${user.id}`, 3, 60 * 60))) return { error: TOO_MANY };
  const sent = await sendVerificationEmail(user);
  return sent ? { ok: `Sent! Check ${user.email}.` } : { error: "Couldn't send the email right now. Try again later." };
}

export async function changePassword(_prev: FormState, formData: FormData): Promise<FormState> {
  const s = await getSession();
  if (!s) redirect("/login");
  const account = s.account;
  if (!(await rateLimit(`pwchange:user:${account.id}`, 10, 60 * 60))) return { error: TOO_MANY };
  const current = String(formData.get("current") ?? "");
  if (!account.passwordHash || !(await bcrypt.compare(current, account.passwordHash))) return { error: "Current password is wrong." };
  const parsed = passwordSchema.safeParse(formData.get("password"));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  if (parsed.data !== formData.get("confirm")) return { error: "Those new passwords don't match." };
  const passwordHash = await bcrypt.hash(parsed.data, 12);
  await db.update(users).set({ passwordHash }).where(eq(users.id, account.id));
  // Sign out every other device, keep this one
  await db.delete(sessions).where(and(eq(sessions.userId, account.id), ne(sessions.id, s.sessionId)));
  return { ok: "Password changed. Other devices got logged out." };
}

export async function changeEmail(_prev: FormState, formData: FormData): Promise<FormState> {
  const account = await requireAccount();
  if (!(await rateLimit(`emailchange:user:${account.id}`, 5, 60 * 60))) return { error: TOO_MANY };
  const parsed = emailSchema.safeParse(formData.get("email"));
  if (!parsed.success) return { error: "That email looks off." };
  const email = parsed.data;
  if (email === account.email) return { error: "That's already your email." };
  if (!account.passwordHash || !(await bcrypt.compare(String(formData.get("password") ?? ""), account.passwordHash))) {
    return { error: "Wrong password." };
  }
  const [taken] = await db.select({ id: users.id }).from(users).where(eq(users.email, email));
  if (taken) return { error: "Another account already uses that email." };
  try {
    await db.update(users).set({ email, emailVerifiedAt: null }).where(eq(users.id, account.id));
  } catch {
    return { error: "Another account already uses that email." };
  }
  const sent = await sendVerificationEmail({ id: account.id, email, handle: account.handle });
  return { ok: sent ? `Email changed. We sent a confirmation link to ${email}.` : `Email changed to ${email}. The confirmation email didn't send; use Resend link above.` };
}
