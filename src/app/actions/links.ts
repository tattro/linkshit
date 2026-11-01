"use server";

import { and, asc, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db, links } from "@/db";
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
    .where(eq(links.userId, user.id));
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

export async function deleteLink(formData: FormData) {
  const user = await requireUser();
  const id = Number(formData.get("id"));
  await db.delete(links).where(and(eq(links.id, id), eq(links.userId, user.id)));
  refresh(user.handle);
}

export async function moveLink(formData: FormData) {
  const user = await requireUser();
  const id = Number(formData.get("id"));
  const dir = formData.get("dir") === "up" ? -1 : 1;
  const rows = await db
    .select({ id: links.id })
    .from(links)
    .where(eq(links.userId, user.id))
    .orderBy(asc(links.position), asc(links.id));
  const i = rows.findIndex((r) => r.id === id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= rows.length) return;
  [rows[i], rows[j]] = [rows[j], rows[i]];
  await db.transaction(async (tx) => {
    for (let k = 0; k < rows.length; k++) {
      await tx.update(links).set({ position: k }).where(and(eq(links.id, rows[k].id), eq(links.userId, user.id)));
    }
  });
  refresh(user.handle);
}
