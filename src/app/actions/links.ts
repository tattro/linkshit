"use server";

import { and, eq, isNotNull, isNull, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { avatars, backgrounds, db, linkThumbs, links, users, type Socials, type Style, type Tips } from "@/db";
import { MAX_BACKUP_BYTES, type Backup, type BackupImage } from "@/lib/backup";
import { PLATFORMS } from "@/lib/socials";
import { sanitizeStyle } from "@/lib/style";
import { THEMES } from "@/lib/themes";
import { TIP_PROVIDERS } from "@/lib/tips";
import { cleanGoogleAnalytics, cleanMetaPixel, cleanTiktokPixel } from "@/lib/tracking";
import { sniffImage } from "@/lib/images";
import { cleanCode } from "@/lib/locks";
import { fetchLinktree, linktreeUsername } from "@/lib/linktree";
import { requireUser } from "@/lib/auth";
import { embedFor } from "@/lib/embeds";
import { rateLimit, TOO_MANY } from "@/lib/ratelimit";
import { unsafeReason } from "@/lib/safety";
import { normalizeUrl } from "@/lib/urls";

export type ActionState = { error?: string; ok?: boolean } | undefined;

const MAX_LINKS = 100;

function refresh(handle: string) {
  revalidatePath("/dashboard");
  revalidatePath(`/${handle}`);
}

/** datetime-local input → Date (interpreted using the browser's offset we send along). */
function parseWhen(value: FormDataEntryValue | null, tzOffset: number): Date | null {
  const v = String(value ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(v)) return null;
  const asUtc = Date.parse(`${v}:00Z`);
  return Number.isNaN(asUtc) ? null : new Date(asUtc + tzOffset * 60_000);
}

/** Keep a single emoji (or a short emoji sequence); anything else is dropped. */
function cleanIcon(raw: string): string {
  const v = raw.trim();
  if (!v) return "";
  const first = [...new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(v)][0]?.segment ?? "";
  return /\p{Extended_Pictographic}/u.test(first) && first.length <= 16 ? first : "";
}

const MAX_THUMB_BYTES = 300 * 1024;

async function readThumb(formData: FormData) {
  const file = formData.get("thumb");
  if (!(file instanceof File) || file.size === 0) return null;
  if (file.size > MAX_THUMB_BYTES) return { error: "That thumbnail is too big. Try one under 300 KB." } as const;
  const data = Buffer.from(await file.arrayBuffer());
  const contentType = sniffImage(data);
  if (!contentType) return { error: "Thumbnails need to be JPG, PNG or WebP." } as const;
  return { data, contentType } as const;
}

/** Stores or clears a link's thumbnail and bumps its version so caches refresh. */
async function saveThumb(linkId: number, thumb: { data: Buffer; contentType: string } | null, remove: boolean) {
  if (thumb) {
    await db.insert(linkThumbs).values({ linkId, ...thumb })
      .onConflictDoUpdate({ target: linkThumbs.linkId, set: thumb });
    await db.update(links).set({ thumbVersion: sql`${links.thumbVersion} + 1` }).where(eq(links.id, linkId));
  } else if (remove) {
    await db.delete(linkThumbs).where(eq(linkThumbs.linkId, linkId));
    await db.update(links).set({ thumbVersion: 0 }).where(eq(links.id, linkId));
  }
}

async function readLinkForm(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim().slice(0, 100);
  const url = normalizeUrl(String(formData.get("url") ?? ""));
  if (!title) return { error: "Give the link a title." } as const;
  if (!url) return { error: "That doesn't look like a valid web address." } as const;
  const unsafe = await unsafeReason(url);
  if (unsafe) return { error: unsafe } as const;
  const tz = Number(formData.get("tz") ?? 0) || 0;
  const startsAt = parseWhen(formData.get("startsAt"), tz);
  const endsAt = parseWhen(formData.get("endsAt"), tz);
  if (startsAt && endsAt && endsAt <= startsAt) return { error: "The end time needs to be after the start time." } as const;
  const embed = formData.get("embed") === "on" && embedFor(url) !== null;
  const sensitive = formData.get("sensitive") === "on";
  const spotlight = formData.get("spotlight") === "on";
  const icon = cleanIcon(String(formData.get("icon") ?? ""));
  const lockCode = cleanCode(formData.get("lockCode"));
  const discountCode = String(formData.get("discountCode") ?? "").trim().slice(0, 40) || null;
  const rawAndroid = String(formData.get("androidUrl") ?? "").trim();
  const androidUrl = rawAndroid ? normalizeUrl(rawAndroid) : null;
  if (rawAndroid && !androidUrl) return { error: "The Android link doesn't look like a valid web address." } as const;
  if (androidUrl) {
    const bad = await unsafeReason(androidUrl);
    if (bad) return { error: bad } as const;
  }
  const thumb = await readThumb(formData);
  if (thumb && "error" in thumb) return { error: thumb.error } as const;
  // A locked link can't play inline, or the lock would be pointless
  return { value: { title, url, startsAt, endsAt, embed: embed && !lockCode, sensitive, spotlight, icon, lockCode, discountCode, androidUrl }, thumb, removeThumb: formData.get("removeThumb") === "on" } as const;
}

export async function addLink(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  if (!(await rateLimit(`links:user:${user.id}`, 120, 60 * 60))) return { error: TOO_MANY };
  const form = await readLinkForm(formData);
  if ("error" in form) return { error: form.error };

  const [{ count, max }] = await db
    .select({ count: sql<number>`count(*)::int`, max: sql<number>`coalesce(max(${links.position}), -1)::int` })
    .from(links)
    .where(and(eq(links.userId, user.id), isNull(links.deletedAt)));
  if (count >= MAX_LINKS) return { error: `You've hit the ${MAX_LINKS} link limit. Impressive.` };

  const [row] = await db.insert(links).values({ userId: user.id, position: max + 1, ...form.value }).returning({ id: links.id });
  await saveThumb(row.id, form.thumb, false);
  refresh(user.handle);
  return { ok: true };
}

export async function updateLink(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  if (!(await rateLimit(`links:user:${user.id}`, 120, 60 * 60))) return { error: TOO_MANY };
  const id = Number(formData.get("id"));
  const form = await readLinkForm(formData);
  if ("error" in form) return { error: form.error };
  const [row] = await db.update(links).set(form.value).where(and(eq(links.id, id), eq(links.userId, user.id), eq(links.heading, false))).returning({ id: links.id });
  if (row) await saveThumb(row.id, form.thumb, form.removeThumb);
  refresh(user.handle);
  return { ok: true };
}

/** Adds a section heading ("Music", "Merch") at the bottom of the list. */
export async function addHeading(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  if (!(await rateLimit(`links:user:${user.id}`, 120, 60 * 60))) return { error: TOO_MANY };
  const title = String(formData.get("title") ?? "").trim().slice(0, 60);
  if (!title) return { error: "Give the heading some words." };
  const [{ count, max }] = await db
    .select({ count: sql<number>`count(*)::int`, max: sql<number>`coalesce(max(${links.position}), -1)::int` })
    .from(links)
    .where(and(eq(links.userId, user.id), isNull(links.deletedAt)));
  if (count >= MAX_LINKS) return { error: `You've hit the ${MAX_LINKS} link limit. Impressive.` };
  await db.insert(links).values({ userId: user.id, position: max + 1, title, url: "", heading: true });
  refresh(user.handle);
  return { ok: true };
}

/** Renames a section heading. */
export async function updateHeading(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const id = Number(formData.get("id"));
  const title = String(formData.get("title") ?? "").trim().slice(0, 60);
  if (!title) return { error: "Give the heading some words." };
  await db.update(links).set({ title }).where(and(eq(links.id, id), eq(links.userId, user.id), eq(links.heading, true)));
  refresh(user.handle);
  return { ok: true };
}

/** "Flush it": moves the link to the graveyard. */
export async function deleteLink(formData: FormData) {
  const user = await requireUser();
  const id = Number(formData.get("id"));
  await db.update(links).set({ deletedAt: new Date() }).where(and(eq(links.id, id), eq(links.userId, user.id)));
  refresh(user.handle);
}

/** Brings a link back from the graveyard, at the bottom of the list. */
export async function reviveLink(formData: FormData) {
  const user = await requireUser();
  const id = Number(formData.get("id"));
  const [{ live, max }] = await db
    .select({ live: sql<number>`count(*)::int`, max: sql<number>`coalesce(max(${links.position}), -1)::int` })
    .from(links)
    .where(and(eq(links.userId, user.id), isNull(links.deletedAt)));
  if (live >= MAX_LINKS) return;
  await db.update(links).set({ deletedAt: null, position: max + 1 })
    .where(and(eq(links.id, id), eq(links.userId, user.id), isNotNull(links.deletedAt)));
  refresh(user.handle);
}

/** Deletes a graveyard link for good. */
export async function deleteLinkForever(formData: FormData) {
  const user = await requireUser();
  const id = Number(formData.get("id"));
  await db.delete(links).where(and(eq(links.id, id), eq(links.userId, user.id), isNotNull(links.deletedAt)));
  refresh(user.handle);
}

/** Saves a new order after drag and drop. Ignores ids that aren't the user's live links. */
export async function reorderLinks(ids: number[]) {
  const user = await requireUser();
  if (!Array.isArray(ids) || ids.length > MAX_LINKS) return;
  const rows = await db
    .select({ id: links.id })
    .from(links)
    .where(and(eq(links.userId, user.id), isNull(links.deletedAt)));
  const mine = new Set(rows.map((r) => r.id));
  const ordered = ids.filter((id) => Number.isInteger(id) && mine.has(id));
  // Anything missing from the list keeps its place at the end
  for (const r of rows) if (!ordered.includes(r.id)) ordered.push(r.id);
  await db.transaction(async (tx) => {
    for (let k = 0; k < ordered.length; k++) {
      await tx.update(links).set({ position: k }).where(and(eq(links.id, ordered[k]), eq(links.userId, user.id)));
    }
  });
  refresh(user.handle);
}

export type ImportState = { error?: string; imported?: number; skipped?: number } | undefined;

/** Copies links (and name/bio, if empty) from a public Linktree page. */
export async function importLinktree(_prev: ImportState, formData: FormData): Promise<ImportState> {
  const user = await requireUser();
  const username = linktreeUsername(String(formData.get("linktree") ?? ""));
  if (!username) return { error: "Paste your Linktree link, like linktr.ee/yourname." };
  if (!(await rateLimit(`import:user:${user.id}`, 5, 60 * 60))) return { error: TOO_MANY };
  const profile = await fetchLinktree(username);
  if (!profile) return { error: "Couldn't read that Linktree page. Check the name and make sure it's public." };
  if (profile.links.length === 0) return { error: "Found the page, but no links on it." };

  const existing = await db
    .select({ url: links.url, position: links.position })
    .from(links)
    .where(and(eq(links.userId, user.id), isNull(links.deletedAt)));
  const have = new Set(existing.map((l) => l.url));
  let position = existing.reduce((m, l) => Math.max(m, l.position), -1) + 1;
  let room = MAX_LINKS - existing.length;
  let imported = 0, skipped = 0;
  for (const l of profile.links) {
    const url = normalizeUrl(l.url);
    if (!url || have.has(url) || room <= 0 || (await unsafeReason(url))) { skipped++; continue; }
    await db.insert(links).values({ userId: user.id, title: l.title, url, position: position++, embed: false });
    have.add(url); room--; imported++;
  }
  const fill: { displayName?: string; bio?: string } = {};
  if (!user.displayName && profile.name) fill.displayName = profile.name;
  if (!user.bio && profile.bio) fill.bio = profile.bio;
  if (Object.keys(fill).length) await db.update(users).set(fill).where(eq(users.id, user.id));
  refresh(user.handle);
  return { imported, skipped };
}

const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
/** ISO time → the "YYYY-MM-DDTHH:MM" (UTC) that readLinkForm expects with tz=0. */
const whenField = (v: unknown) => {
  const t = typeof v === "string" ? Date.parse(v) : NaN;
  return Number.isNaN(t) ? "" : new Date(t).toISOString().slice(0, 16);
};
function decodeImage(img: BackupImage | undefined, maxBytes: number) {
  if (!img || typeof img.data !== "string") return null;
  const data = Buffer.from(img.data, "base64");
  if (data.length === 0 || data.length > maxBytes) return null;
  const contentType = sniffImage(data);
  return contentType ? { data, contentType } : null;
}

/**
 * "Restore my page" from a downloaded backup. Every field goes through the same checks as the
 * editor. Current links move to the graveyard first, so nothing is lost if it was the wrong file.
 */
export async function restorePage(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  if (!(await rateLimit(`restore:user:${user.id}`, 10, 24 * 60 * 60))) return { error: TOO_MANY };
  const file = formData.get("backup");
  if (!(file instanceof File) || file.size === 0) return { error: "Pick a backup file first." };
  if (file.size > MAX_BACKUP_BYTES) return { error: "That backup is too big to restore (4 MB max)." };
  let b: Backup;
  try { b = JSON.parse(await file.text()); } catch { return { error: "That isn't a linksh.it backup file." }; }
  if (!b || b.app !== "linksh.it" || b.version !== 1 || !b.page || !Array.isArray(b.links)) {
    return { error: "That isn't a linksh.it backup file." };
  }
  if (b.links.length > MAX_LINKS) return { error: `That backup has more than ${MAX_LINKS} links.` };

  // Check every link before touching anything
  type Ready = { value: typeof links.$inferInsert; thumb: { data: Buffer; contentType: string } | null };
  const ready: Ready[] = [];
  for (const [i, l] of b.links.entries()) {
    if (!l || typeof l !== "object") return { error: `Link ${i + 1} in that file is broken.` };
    if (l.heading) {
      const title = str(l.title, 60);
      if (title) ready.push({ value: { userId: user.id, title, url: "", heading: true }, thumb: null });
      continue;
    }
    const fd = new FormData();
    fd.set("title", str(l.title, 100));
    fd.set("url", str(l.url, 2000));
    if (l.embed) fd.set("embed", "on");
    if (l.sensitive) fd.set("sensitive", "on");
    if (l.spotlight) fd.set("spotlight", "on");
    fd.set("icon", str(l.icon, 16));
    fd.set("lockCode", str(l.lockCode, 40));
    fd.set("discountCode", str(l.discountCode, 40));
    fd.set("androidUrl", str(l.androidUrl, 2000));
    fd.set("startsAt", whenField(l.startsAt));
    fd.set("endsAt", whenField(l.endsAt));
    fd.set("tz", "0");
    const form = await readLinkForm(fd);
    if ("error" in form) return { error: `Link ${i + 1} (${str(l.title, 40) || "untitled"}): ${form.error}` };
    ready.push({ value: { userId: user.id, ...form.value }, thumb: decodeImage(l.thumb, MAX_THUMB_BYTES) });
  }

  const p = b.page;
  const pick = <T extends { id: string; toUrl: (v: string) => string | null }>(list: T[], from: unknown) => {
    const out: Record<string, string> = {};
    const src = from && typeof from === "object" ? (from as Record<string, unknown>) : {};
    for (const x of list) {
      const url = typeof src[x.id] === "string" ? x.toUrl(src[x.id] as string) : null;
      if (url) out[x.id] = url;
    }
    return out;
  };
  const rawStyle = (p.style && typeof p.style === "object" ? p.style : {}) as Style;
  const style: Style = { ...sanitizeStyle(rawStyle), ...(rawStyle.bgTint === "dark" || rawStyle.bgTint === "light" ? { bgTint: rawStyle.bgTint } : {}) };
  const avatar = decodeImage(b.avatar, 400 * 1024);
  const background = decodeImage(b.background, 900 * 1024);
  const now = new Date();

  await db.transaction(async (tx) => {
    await tx.update(links).set({ deletedAt: now })
      .where(and(eq(links.userId, user.id), isNull(links.deletedAt), isNull(links.offerId)));
    await tx.update(users).set({
      displayName: str(p.displayName, 60), bio: str(p.bio, 160),
      theme: THEMES.some((t) => t.id === p.theme) ? p.theme : user.theme,
      style, socials: pick(PLATFORMS, p.socials) as Socials, tips: pick(TIP_PROVIDERS, p.tips) as Tips,
      openInApp: p.openInApp !== false, signupEnabled: p.signupEnabled === true, signupPrompt: str(p.signupPrompt, 80),
      lockCode: cleanCode(str(p.lockCode, 40)), seoTitle: str(p.seoTitle, 70), seoDescription: str(p.seoDescription, 200),
      metaPixel: cleanMetaPixel(str(p.metaPixel, 100)) ?? "", googleAnalytics: cleanGoogleAnalytics(str(p.googleAnalytics, 100)) ?? "",
      tiktokPixel: cleanTiktokPixel(str(p.tiktokPixel, 100)) ?? "", utm: p.utm === true,
      redirectLinkId: null,
      ...(avatar ? { avatarVersion: sql`${users.avatarVersion} + 1` } : {}),
      ...(background ? { bgVersion: sql`${users.bgVersion} + 1` } : {}),
    }).where(eq(users.id, user.id));
    if (avatar) {
      await tx.insert(avatars).values({ userId: user.id, ...avatar })
        .onConflictDoUpdate({ target: avatars.userId, set: { ...avatar, updatedAt: now } });
    }
    if (background) {
      await tx.insert(backgrounds).values({ userId: user.id, ...background })
        .onConflictDoUpdate({ target: backgrounds.userId, set: { ...background, updatedAt: now } });
    }
    const [{ max }] = await tx.select({ max: sql<number>`coalesce(max(${links.position}), -1)::int` }).from(links)
      .where(and(eq(links.userId, user.id), isNull(links.deletedAt)));
    for (const [i, r] of ready.entries()) {
      const [row] = await tx.insert(links)
        .values({ ...r.value, position: max + 1 + i, thumbVersion: r.thumb ? 1 : 0 })
        .returning({ id: links.id });
      if (r.thumb) await tx.insert(linkThumbs).values({ linkId: row.id, ...r.thumb });
    }
  });
  refresh(user.handle);
  return { ok: true };
}
