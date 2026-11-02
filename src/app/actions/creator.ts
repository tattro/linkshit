"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db, users } from "@/db";
import { requireUser } from "@/lib/auth";
import { isCreatorType } from "@/lib/creatorTypes";

/** "What do you do?" Saves the answer ("skip" stores "other"). Only changes suggestions. */
export async function setCreatorType(formData: FormData) {
  const user = await requireUser();
  const raw = String(formData.get("creatorType") ?? "");
  const creatorType = raw === "skip" ? "other" : isCreatorType(raw) ? raw : null;
  if (!creatorType) return;

  await db.update(users).set({ creatorType }).where(eq(users.id, user.id));
  revalidatePath("/dashboard");
  // From the welcome screen: on to the (now tailored) dashboard
  if (formData.get("next") === "welcome") redirect("/dashboard?welcome=1");
}
