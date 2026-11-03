"use server";

import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { sniffImage } from "@/lib/images";
import { avatars, backgrounds, db, handleRedirects, users, type Socials, type Tips } from "@/db";
import { handleProblem, normalizeHandle } from "@/lib/handles";
import { handleTaken } from "@/lib/handleTaken";
import { TIP_PROVIDERS } from "@/lib/tips";
import { requireAccount, requireUser } from "@/lib/auth";
import { rateLimit, TOO_MANY } from "@/lib/ratelimit";
import { PLATFORMS } from "@/lib/socials";
import { parseStyle } from "@/lib/style";
import { THEMES } from "@/lib/themes";

export type ProfileState = { error?: string; ok?: boolean } | undefined;

function refresh(handle: string) {
  revalidatePath("/dashboard");
  revalidatePath(`/${handle}`);
}

export async function updateProfile(_prev: ProfileState, formData: FormData): Promise<ProfileState> {
  const user = await requireUser();
  const displayName = String(formData.get("displayName") ?? "").trim().slice(0, 60);
  const bio = String(formData.get("bio") ?? "").trim().slice(0, 160);
  await db.update(users).set({ displayName, bio }).where(eq(users.id, user.id));
  // The weekly email setting lives on the account, whichever page is being edited
  const account = await requireAccount();
  const every = formData.get("statsEmail");
  await db
    .update(users)
    .set({
      weeklyEmail: every === "week" || every === "month",
      ...(every === "month" ? { statsEvery: "month" as const } : every === "week" ? { statsEvery: "week" as const } : {}),
      // Keep the original consent time if it was already on
      marketingOptInAt: formData.get("marketing") === "on" ? (account.marketingOptInAt ?? new Date()) : null,
    })
    .where(eq(users.id, account.id));
  refresh(user.handle);
  return { ok: true };
}

export async function updateLook(_prev: ProfileState, formData: FormData): Promise<ProfileState> {
  const user = await requireUser();
  const themeRaw = String(formData.get("theme") ?? "");
  const theme = THEMES.some((t) => t.id === themeRaw) ? themeRaw : user.theme;
  const style = parseStyle(Object.fromEntries(formData));
  const openInApp = formData.get("openInApp") === "on";
  await db.update(users).set({ theme, style, openInApp }).where(eq(users.id, user.id));
  refresh(user.handle);
  return { ok: true };
}

export async function updateSocials(_prev: ProfileState, formData: FormData): Promise<ProfileState> {
  const user = await requireUser();
  const socials: Socials = {};
  for (const p of PLATFORMS) {
    const raw = String(formData.get(p.id) ?? "").trim();
    if (!raw) continue;
    const url = p.toUrl(raw);
    if (!url) return { error: `That ${p.label} doesn't look right. Use a username or a ${p.label} link.` };
    socials[p.id] = url;
  }
  await db.update(users).set({ socials }).where(eq(users.id, user.id));
  refresh(user.handle);
  return { ok: true };
}

const MAX_AVATAR_BYTES = 400 * 1024;
const TYPES = new Set(["image/webp", "image/jpeg", "image/png"]);

const sniff = sniffImage;

export async function uploadAvatar(_prev: ProfileState, formData: FormData): Promise<ProfileState> {
  const user = await requireUser();
  if (!(await rateLimit(`avatar:user:${user.id}`, 20, 60 * 60))) return { error: TOO_MANY };
  const file = formData.get("avatar");
  if (!(file instanceof File) || file.size === 0) return { error: "Pick an image first." };
  if (file.size > MAX_AVATAR_BYTES) return { error: "That image is too big. Try a smaller one." };
  const data = Buffer.from(await file.arrayBuffer());
  const contentType = sniff(data);
  if (!contentType || !TYPES.has(contentType)) return { error: "Use a JPG, PNG or WebP image." };
  await db
    .insert(avatars)
    .values({ userId: user.id, data, contentType })
    .onConflictDoUpdate({ target: avatars.userId, set: { data, contentType, updatedAt: new Date() } });
  await db.update(users).set({ avatarVersion: sql`${users.avatarVersion} + 1` }).where(eq(users.id, user.id));
  refresh(user.handle);
  return { ok: true };
}

export async function removeAvatar() {
  const user = await requireUser();
  await db.delete(avatars).where(eq(avatars.userId, user.id));
  await db.update(users).set({ avatarVersion: 0 }).where(eq(users.id, user.id));
  refresh(user.handle);
}

const MAX_BG_BYTES = 900 * 1024;

export async function uploadBackground(_prev: ProfileState, formData: FormData): Promise<ProfileState> {
  const user = await requireUser();
  if (!(await rateLimit(`bg:user:${user.id}`, 20, 60 * 60))) return { error: TOO_MANY };
  const file = formData.get("background");
  if (!(file instanceof File) || file.size === 0) return { error: "Pick an image first." };
  if (file.size > MAX_BG_BYTES) return { error: "That image is too big. Try a smaller one." };
  const data = Buffer.from(await file.arrayBuffer());
  const contentType = sniff(data);
  if (!contentType || !TYPES.has(contentType)) return { error: "Use a JPG, PNG or WebP image." };
  await db
    .insert(backgrounds)
    .values({ userId: user.id, data, contentType })
    .onConflictDoUpdate({ target: backgrounds.userId, set: { data, contentType, updatedAt: new Date() } });
  await db.update(users).set({ bgVersion: sql`${users.bgVersion} + 1` }).where(eq(users.id, user.id));
  refresh(user.handle);
  return { ok: true };
}

export async function removeBackground() {
  const user = await requireUser();
  await db.delete(backgrounds).where(eq(backgrounds.userId, user.id));
  await db.update(users).set({ bgVersion: 0 }).where(eq(users.id, user.id));
  refresh(user.handle);
}

export async function updateTips(_prev: ProfileState, formData: FormData): Promise<ProfileState> {
  const user = await requireUser();
  const tips: Tips = {};
  for (const p of TIP_PROVIDERS) {
    const raw = String(formData.get(p.id) ?? "").trim();
    if (!raw) continue;
    const url = p.toUrl(raw);
    if (!url) return { error: `That ${p.label} doesn't look right. Use a username or a ${p.label} link.` };
    tips[p.id] = url;
  }
  await db.update(users).set({ tips }).where(eq(users.id, user.id));
  refresh(user.handle);
  return { ok: true };
}

export async function updateSignup(_prev: ProfileState, formData: FormData): Promise<ProfileState> {
  const user = await requireUser();
  const signupEnabled = formData.get("signupEnabled") === "on";
  const signupPrompt = String(formData.get("signupPrompt") ?? "").trim().slice(0, 80);
  await db.update(users).set({ signupEnabled, signupPrompt }).where(eq(users.id, user.id));
  refresh(user.handle);
  return { ok: true };
}

export async function changeHandle(_prev: ProfileState, formData: FormData): Promise<ProfileState> {
  const user = await requireUser();
  const handle = normalizeHandle(String(formData.get("handle") ?? ""));
  if (handle === user.handle) return { error: "That's already your handle." };
  const problem = handleProblem(handle);
  if (problem) return { error: problem };
  if (await handleTaken(handle, user.id)) return { error: `Someone already claimed linksh.it/${handle}.` };
  if (!(await rateLimit(`rename:user:${user.id}`, 3, 24 * 60 * 60))) return { error: "You've renamed a lot today. Try again tomorrow." };
  try {
    await db.transaction(async (tx) => {
      await tx.update(users).set({ handle }).where(eq(users.id, user.id));
      // Old handle keeps redirecting here; taking back an old handle of your own clears its redirect
      await tx.delete(handleRedirects).where(eq(handleRedirects.handle, handle));
      await tx.insert(handleRedirects).values({ handle: user.handle, userId: user.id })
        .onConflictDoUpdate({ target: handleRedirects.handle, set: { userId: user.id, createdAt: new Date() } });
    });
  } catch {
    return { error: "That handle was just taken. Try another." };
  }
  revalidatePath("/dashboard");
  revalidatePath(`/${user.handle}`);
  revalidatePath(`/${handle}`);
  return { ok: true };
}
