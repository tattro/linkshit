"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db, users } from "@/db";
import { requireAccount } from "@/lib/auth";

export async function joinMarketplaceWaitlist() {
  const account = await requireAccount();
  if (!account.marketplaceInterestAt) {
    await db.update(users).set({ marketplaceInterestAt: new Date() }).where(eq(users.id, account.id));
  }
  revalidatePath("/dashboard/marketplace");
}
