"use server";

import { and, asc, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db, links, users } from "@/db";
import { requireUser } from "@/lib/auth";
import { THEMES } from "@/lib/themes";
import { normalizeUrl } from "@/lib/urls";

export type ActionState = { error?: string; ok?: boolean } | undefined;

const MAX_LINKS = 100;

function refresh(handle: string) {
  revalidatePath("/dashboard");
  revalidatePath(`/${handle}`);
}

export async function addLink(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const title = String(formData.get("title") ?? "").trim().slice(0, 100);
  const url = normalizeUrl(String(formData.get("url") ?? ""));
  if (!title) return { error: "Give the link a title." };
  if (!url) return { error: "That doesn't look like a valid web address." };

  const [{ count, max }] = await db
    .select({ count: sql<number>`count(*)::int`, max: sql<number>`coalesce(max(${links.position}), -1)::int` })
    .from(links)
    .where(eq(links.userId, user.id));
  if (count >= MAX_LINKS) return { error: `You've hit the ${MAX_LINKS} link limit. Impressive.` };

  await db.insert(links).values({ userId: user.id, title, url, position: max + 1 });
  refresh(user.handle);
  return { ok: true };
}

export async function updateLink(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const id = Number(formData.get("id"));
  const title = String(formData.get("title") ?? "").trim().slice(0, 100);
  const url = normalizeUrl(String(formData.get("url") ?? ""));
  if (!title) return { error: "Title can't be empty." };
  if (!url) return { error: "That doesn't look like a valid web address." };
  await db.update(links).set({ title, url }).where(and(eq(links.id, id), eq(links.userId, user.id)));
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

export async function updateProfile(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const displayName = String(formData.get("displayName") ?? "").trim().slice(0, 60);
  const bio = String(formData.get("bio") ?? "").trim().slice(0, 160);
  const themeRaw = String(formData.get("theme") ?? "");
  const theme = THEMES.some((t) => t.id === themeRaw) ? themeRaw : user.theme;
  await db.update(users).set({ displayName, bio, theme }).where(eq(users.id, user.id));
  refresh(user.handle);
  return { ok: true };
}
