"use server";

import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { avatars, db, users, type Socials } from "@/db";
import { requireUser } from "@/lib/auth";
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
  refresh(user.handle);
  return { ok: true };
}

export async function updateLook(_prev: ProfileState, formData: FormData): Promise<ProfileState> {
  const user = await requireUser();
  const themeRaw = String(formData.get("theme") ?? "");
  const theme = THEMES.some((t) => t.id === themeRaw) ? themeRaw : user.theme;
  const style = parseStyle(Object.fromEntries(formData));
  await db.update(users).set({ theme, style }).where(eq(users.id, user.id));
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

function sniff(buf: Buffer): string | null {
  if (buf.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))) return "image/jpeg";
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (buf.subarray(0, 4).toString("ascii") === "RIFF" && buf.subarray(8, 12).toString("ascii") === "WEBP") return "image/webp";
  return null;
}

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
