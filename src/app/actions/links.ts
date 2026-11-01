"use server";

import { and, eq, isNotNull, isNull, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db, links, users } from "@/db";
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
  return { value: { title, url, startsAt, endsAt, embed, sensitive, spotlight, icon } } as const;
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

  await db.insert(links).values({ userId: user.id, position: max + 1, ...form.value });
  refresh(user.handle);
  return { ok: true };
}

export async function updateLink(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  if (!(await rateLimit(`links:user:${user.id}`, 120, 60 * 60))) return { error: TOO_MANY };
  const id = Number(formData.get("id"));
  const form = await readLinkForm(formData);
  if ("error" in form) return { error: form.error };
  await db.update(links).set(form.value).where(and(eq(links.id, id), eq(links.userId, user.id)));
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
