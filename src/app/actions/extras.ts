"use server";

import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db, links, users } from "@/db";
import { requireUser } from "@/lib/auth";
import { cleanCode } from "@/lib/locks";
import { cleanGoogleAnalytics, cleanMetaPixel, cleanTiktokPixel } from "@/lib/tracking";

export type ExtrasState = { error?: string; ok?: boolean } | undefined;

function refresh(handle: string) {
  revalidatePath("/dashboard");
  revalidatePath(`/${handle}`);
}

/** Redirect mode: send every visitor straight to one of your links (or turn it off). */
export async function setRedirect(_prev: ExtrasState, formData: FormData): Promise<ExtrasState> {
  const user = await requireUser();
  const raw = String(formData.get("linkId") ?? "");
  let linkId: number | null = null;
  if (raw) {
    const [link] = await db.select({ id: links.id }).from(links)
      .where(and(eq(links.id, Number(raw)), eq(links.userId, user.id), isNull(links.deletedAt), eq(links.heading, false)));
    if (!link) return { error: "Pick one of your links." };
    linkId = link.id;
  }
  await db.update(users).set({ redirectLinkId: linkId }).where(eq(users.id, user.id));
  refresh(user.handle);
  return { ok: true };
}

/** Lock the whole page behind a code (empty code = unlocked). */
export async function setPageLock(_prev: ExtrasState, formData: FormData): Promise<ExtrasState> {
  const user = await requireUser();
  await db.update(users).set({ lockCode: cleanCode(formData.get("code")) }).where(eq(users.id, user.id));
  refresh(user.handle);
  return { ok: true };
}

/** Title and description for Google and link previews. */
export async function setSeo(_prev: ExtrasState, formData: FormData): Promise<ExtrasState> {
  const user = await requireUser();
  const seoTitle = String(formData.get("seoTitle") ?? "").trim().slice(0, 70);
  const seoDescription = String(formData.get("seoDescription") ?? "").trim().slice(0, 200);
  await db.update(users).set({ seoTitle, seoDescription }).where(eq(users.id, user.id));
  refresh(user.handle);
  return { ok: true };
}

/** Meta Pixel, Google Analytics, TikTok Pixel and UTM tags. */
export async function setTracking(_prev: ExtrasState, formData: FormData): Promise<ExtrasState> {
  const user = await requireUser();
  const metaPixel = cleanMetaPixel(String(formData.get("metaPixel") ?? ""));
  if (metaPixel === null) return { error: "The Meta Pixel ID should be just numbers, like 123456789012345." };
  const googleAnalytics = cleanGoogleAnalytics(String(formData.get("googleAnalytics") ?? ""));
  if (googleAnalytics === null) return { error: "The Google Analytics ID should look like G-ABC123XYZ." };
  const tiktokPixel = cleanTiktokPixel(String(formData.get("tiktokPixel") ?? ""));
  if (tiktokPixel === null) return { error: "The TikTok Pixel ID should be letters and numbers, like C4ABCDEF1234567890." };
  const utm = formData.get("utm") === "on";
  await db.update(users).set({ metaPixel, googleAnalytics, tiktokPixel, utm }).where(eq(users.id, user.id));
  refresh(user.handle);
  return { ok: true };
}
