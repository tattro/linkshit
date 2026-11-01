"use server";

import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db, sessions, users } from "@/db";
import {
  consumeEmailToken, createSession, destroySession, requireUser, sendResetEmail, sendVerificationEmail,
} from "@/lib/auth";
import { handleProblem, normalizeHandle } from "@/lib/handles";
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
  const fields = { email: raw.email, handle: raw.handle };
  if (String(formData.get("website") ?? "")) return { error: "Nice try, robot.", fields }; // honeypot

  const parsed = z.object({ email: emailSchema, password: passwordSchema }).safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0].message, fields };

  const handle = normalizeHandle(raw.handle);
  const problem = handleProblem(handle);
  if (problem) return { error: problem, fields };

  if (!(await rateLimit(`signup:ip:${await clientIp()}`, 5, 60 * 60))) return { error: TOO_MANY, fields };

  const [emailTaken] = await db.select({ id: users.id }).from(users).where(eq(users.email, parsed.data.email));
  if (emailTaken) return { error: "There's already an account with that email. Log in instead?", fields };
  const [handleTaken] = await db.select({ id: users.id }).from(users).where(eq(users.handle, handle));
  if (handleTaken) return { error: `Someone already claimed linksh.it/${handle}.`, fields };

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  let user: { id: number; email: string; handle: string };
  try {
    [user] = await db
      .insert(users)
      .values({ email: parsed.data.email, passwordHash, handle, displayName: handle })
      .returning({ id: users.id, email: users.email, handle: users.handle });
  } catch {
    // Unique index race: someone grabbed it between the check and the insert
    return { error: "That handle or email was just taken. Try again.", fields };
  }

  await sendVerificationEmail(user);
  await createSession(user.id);
  redirect("/dashboard?welcome=1");
}

export async function login(_prev: FormState, formData: FormData): Promise<FormState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const ip = await clientIp();
  if (!(await rateLimit(`login:ip:${ip}`, 30, 15 * 60)) || !(await rateLimit(`login:email:${email}`, 10, 15 * 60))) {
    return { error: TOO_MANY, fields: { email } };
  }
  const [user] = await db.select().from(users).where(eq(users.email, email));
  const ok = user ? await bcrypt.compare(password, user.passwordHash) : false;
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
  return { ok: "If that email has an account, a reset link is on its way. Check your spam folder too." };
}

export async function resetPassword(_prev: FormState, formData: FormData): Promise<FormState> {
  const token = String(formData.get("token") ?? "");
  const parsed = passwordSchema.safeParse(formData.get("password"));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  if (parsed.data !== formData.get("confirm")) return { error: "Those passwords don't match." };
  const userId = await consumeEmailToken(token, "reset");
  if (!userId) return { error: "This reset link has expired or was already used. Request a new one." };
  const passwordHash = await bcrypt.hash(parsed.data, 12);
  // Resetting proves they own the inbox, so count it as verified too
  await db.update(users).set({ passwordHash, emailVerifiedAt: new Date() }).where(eq(users.id, userId));
  await db.delete(sessions).where(eq(sessions.userId, userId)); // sign out everywhere else
  await createSession(userId);
  redirect("/dashboard?reset=1");
}

export async function resendVerification(): Promise<FormState> {
  const user = await requireUser();
  if (user.emailVerifiedAt) return { ok: "You're already verified." };
  if (!(await rateLimit(`verify:user:${user.id}`, 3, 60 * 60))) return { error: TOO_MANY };
  const sent = await sendVerificationEmail(user);
  return sent ? { ok: `Sent! Check ${user.email}.` } : { error: "Couldn't send the email right now. Try again later." };
}
