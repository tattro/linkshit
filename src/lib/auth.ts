import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt, isNull, lt } from "drizzle-orm";
import { db, emailTokens, sessions, users, type User } from "@/db";
import { buttonEmail, sendEmail } from "./email";
import { siteUrl } from "./request";

const COOKIE = "lsid";
const SESSION_DAYS = 30;

export const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");
const newToken = () => randomBytes(32).toString("base64url");

export async function createSession(userId: number) {
  const token = newToken();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await db.insert(sessions).values({ id: hashToken(token), userId, expiresAt });
  // Opportunistic cleanup of expired sessions
  await db.delete(sessions).where(lt(sessions.expiresAt, new Date()));
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function getCurrentUser(): Promise<User | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  const rows = await db
    .select({ user: users, expiresAt: sessions.expiresAt })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(eq(sessions.id, hashToken(token)))
    .limit(1);
  const row = rows[0];
  if (!row || row.expiresAt < new Date() || row.user.bannedAt) return null;
  return row.user;
}

export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export function isAdmin(user: Pick<User, "isAdmin" | "email">) {
  const list = (process.env.ADMIN_EMAILS ?? "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
  return user.isAdmin || list.includes(user.email.toLowerCase());
}

export async function requireAdmin(): Promise<User> {
  const user = await requireUser();
  if (!isAdmin(user)) redirect("/dashboard");
  return user;
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) await db.delete(sessions).where(eq(sessions.id, hashToken(token)));
  jar.delete(COOKIE);
}

// ---- Email tokens (verification + password reset) ----

const TOKEN_TTL = { verify: 7 * 24 * 60 * 60 * 1000, reset: 60 * 60 * 1000 };

async function createEmailToken(userId: number, kind: "verify" | "reset") {
  const token = newToken();
  // Only the newest link of each kind works
  await db.delete(emailTokens).where(and(eq(emailTokens.userId, userId), eq(emailTokens.kind, kind)));
  await db.insert(emailTokens).values({
    id: hashToken(token), userId, kind, expiresAt: new Date(Date.now() + TOKEN_TTL[kind]),
  });
  return token;
}

/** Marks the token used and returns its user id, or null if it's invalid/expired/used. */
export async function consumeEmailToken(token: string, kind: "verify" | "reset"): Promise<number | null> {
  const [row] = await db
    .update(emailTokens)
    .set({ usedAt: new Date() })
    .where(and(
      eq(emailTokens.id, hashToken(token)), eq(emailTokens.kind, kind),
      isNull(emailTokens.usedAt), gt(emailTokens.expiresAt, new Date()),
    ))
    .returning({ userId: emailTokens.userId });
  return row?.userId ?? null;
}

export async function peekEmailToken(token: string, kind: "verify" | "reset"): Promise<boolean> {
  const [row] = await db.select({ id: emailTokens.id }).from(emailTokens).where(and(
    eq(emailTokens.id, hashToken(token)), eq(emailTokens.kind, kind),
    isNull(emailTokens.usedAt), gt(emailTokens.expiresAt, new Date()),
  ));
  return Boolean(row);
}

export async function sendVerificationEmail(user: Pick<User, "id" | "email" | "handle">) {
  const token = await createEmailToken(user.id, "verify");
  const url = `${await siteUrl()}/verify?token=${token}`;
  const { text, html } = buttonEmail(
    `Is this really you, @${user.handle}?`,
    "Prove this inbox is yours and not some sh.itty bot's. One click and you're legit. (It also means you can reset your password when you inevitably forget it.)",
    "Yep, it's me", url,
  );
  return sendEmail(user.email, "Confirm your linksh.it email (it's not spam, promise)", text, html);
}

export async function sendResetEmail(user: Pick<User, "id" | "email" | "handle">) {
  const token = await createEmailToken(user.id, "reset");
  const url = `${await siteUrl()}/reset?token=${token}`;
  const { text, html } = buttonEmail(
    "Ahh, sh.it. You forgot your password again, didn't you?",
    `No judgement. Well, a little judgement. Hit the button to pick a new password for linksh.it/${user.handle}. This link self-destructs in one hour.`,
    "Fix my mess", url,
  );
  return sendEmail(user.email, "Ahh, sh.it. Password reset inside", text, html);
}
