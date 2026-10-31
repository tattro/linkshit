"use server";

import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db, users } from "@/db";
import { createSession, destroySession } from "@/lib/auth";
import { handleProblem, normalizeHandle } from "@/lib/handles";

export type FormState = { error?: string; fields?: Record<string, string> } | undefined;

const signupSchema = z.object({
  email: z.string().trim().toLowerCase().email("That email looks off."),
  password: z.string().min(8, "Passwords need at least 8 characters.").max(200),
  handle: z.string(),
});

export async function signup(_prev: FormState, formData: FormData): Promise<FormState> {
  const raw = {
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
    handle: String(formData.get("handle") ?? ""),
  };
  const fields = { email: raw.email, handle: raw.handle };
  const parsed = signupSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0].message, fields };

  const handle = normalizeHandle(parsed.data.handle);
  const problem = handleProblem(handle);
  if (problem) return { error: problem, fields };

  const [emailTaken] = await db.select({ id: users.id }).from(users).where(eq(users.email, parsed.data.email));
  if (emailTaken) return { error: "There's already an account with that email. Log in instead?", fields };
  const [handleTaken] = await db.select({ id: users.id }).from(users).where(eq(users.handle, handle));
  if (handleTaken) return { error: `Someone already claimed linksh.it/${handle}.`, fields };

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  let userId: number;
  try {
    const [user] = await db
      .insert(users)
      .values({ email: parsed.data.email, passwordHash, handle, displayName: handle })
      .returning({ id: users.id });
    userId = user.id;
  } catch {
    // Unique index race: someone grabbed it between the check and the insert
    return { error: "That handle or email was just taken. Try again.", fields };
  }

  await createSession(userId);
  redirect("/dashboard?welcome=1");
}

export async function login(_prev: FormState, formData: FormData): Promise<FormState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const [user] = await db.select().from(users).where(eq(users.email, email));
  const ok = user ? await bcrypt.compare(password, user.passwordHash) : false;
  if (!user || !ok) return { error: "Wrong email or password.", fields: { email } };
  await createSession(user.id);
  redirect("/dashboard");
}

export async function logout() {
  await destroySession();
  redirect("/");
}
