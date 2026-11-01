"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db, sessions, users } from "@/db";
import { requireAdmin } from "@/lib/auth";

export async function setBan(formData: FormData) {
  const admin = await requireAdmin();
  const id = Number(formData.get("id"));
  const ban = formData.get("ban") === "1";
  if (!Number.isInteger(id) || id === admin.id) return;
  const reason = String(formData.get("reason") ?? "").trim().slice(0, 200) || null;
  const [user] = await db
    .update(users)
    .set(ban ? { bannedAt: new Date(), banReason: reason } : { bannedAt: null, banReason: null })
    .where(eq(users.id, id))
    .returning({ handle: users.handle });
  if (ban) await db.delete(sessions).where(eq(sessions.userId, id)); // kick them out
  revalidatePath("/admin");
  if (user) revalidatePath(`/${user.handle}`);
}
