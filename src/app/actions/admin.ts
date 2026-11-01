"use server";

import { eq, or } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db, sessions, users } from "@/db";
import { requireAdmin } from "@/lib/auth";

export async function setBan(formData: FormData) {
  const admin = await requireAdmin();
  const id = Number(formData.get("id"));
  const ban = formData.get("ban") === "1";
  if (!Number.isInteger(id) || id === admin.id) return;
  const reason = String(formData.get("reason") ?? "").trim().slice(0, 200) || null;
  // Banning an account takes its extra pages down with it
  const hit = await db
    .update(users)
    .set(ban ? { bannedAt: new Date(), banReason: reason } : { bannedAt: null, banReason: null })
    .where(or(eq(users.id, id), eq(users.ownerId, id)))
    .returning({ handle: users.handle });
  if (ban) await db.delete(sessions).where(eq(sessions.userId, id)); // kick them out
  revalidatePath("/admin");
  for (const u of hit) revalidatePath(`/${u.handle}`);
}
