"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db, users } from "@/db";
import { verifyUnsubscribe } from "@/lib/unsubscribe";

export async function unsubscribeWeekly(formData: FormData) {
  const userId = verifyUnsubscribe(formData.get("u"), formData.get("t"));
  if (!userId) redirect("/unsubscribe?bad=1");
  await db.update(users).set({ weeklyEmail: false }).where(eq(users.id, userId));
  redirect("/unsubscribe?done=1");
}
