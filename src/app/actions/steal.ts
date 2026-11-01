"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db, users, type Style } from "@/db";
import { requireUser } from "@/lib/auth";
import { linktreeUsername, fetchLinktree } from "@/lib/linktree";
import { getPublicProfile, renamedTo } from "@/lib/profile";
import { rateLimit, TOO_MANY } from "@/lib/ratelimit";
import { sanitizeStyle } from "@/lib/style";
import { THEMES } from "@/lib/themes";

type Look = { theme: string; style: Style };
export type StealState = { error?: string; ok?: string; previous?: Look } | undefined;

/** "linksh.it/name", "https://www.linksh.it/name", "@name" or "name" → "name". */
function linkshHandle(raw: string): string | null {
  let v = raw.trim();
  const m = v.match(/^(?:https?:\/\/)?(?:www\.)?linksh\.it\/@?([^/?#\s]+)/i);
  if (m) v = m[1];
  else if (/[/.:]/.test(v)) return null;
  v = v.replace(/^@/, "").toLowerCase();
  return /^[a-z0-9_-]{1,30}$/.test(v) ? v : null;
}

async function save(userId: number, handle: string, look: Look) {
  await db.update(users).set(look).where(eq(users.id, userId));
  revalidatePath("/dashboard");
  revalidatePath(`/${handle}`);
}

/** Copies the design (never the content) of another linksh.it page or a Linktree onto the current page. */
export async function stealLook(_prev: StealState, formData: FormData): Promise<StealState> {
  const user = await requireUser();
  const raw = String(formData.get("source") ?? "").trim();
  if (!raw) return { error: "Paste a linksh.it or Linktree link." };
  if (!(await rateLimit(`steal:user:${user.id}`, 20, 60 * 60))) return { error: TOO_MANY };
  const previous: Look = { theme: user.theme, style: user.style };

  const handle = !/linktr\.ee/i.test(raw) ? linkshHandle(raw) : null;
  if (handle) {
    const victimHandle = (await getPublicProfile("handle", handle)) ? handle : await renamedTo(handle);
    const victim = victimHandle ? await getPublicProfile("handle", victimHandle) : null;
    if (!victim) return { error: `Nobody's at linksh.it/${handle}. Check the spelling?` };
    if (victim.user.id === user.id) return { error: "That's your own page, genius." };
    const theme = THEMES.some((t) => t.id === victim.user.theme) ? victim.user.theme : user.theme;
    await save(user.id, user.handle, { theme, style: sanitizeStyle(victim.user.style) });
    return { ok: `Stole linksh.it/${victim.user.handle}'s look. 😈 Your links and photo stayed yours.`, previous };
  }

  const tree = linktreeUsername(raw);
  if (!tree) return { error: "That doesn't look like a linksh.it or Linktree link." };
  const profile = await fetchLinktree(tree);
  if (!profile) return { error: "Couldn't load that Linktree. Is the link right?" };
  if (!profile.look) return { error: "Couldn't figure out that Linktree's design. It might use one of their stock themes." };
  const l = profile.look;
  const style = sanitizeStyle({
    bg: l.bg, bg2: l.bg2, text: l.text, button: l.button, buttonText: l.buttonText, shape: l.shape, font: l.font,
  });
  await save(user.id, user.handle, { theme: THEMES[0].id, style });
  return { ok: `Stole linktr.ee/${tree}'s vibe as closely as we could. 😈 Tweak it below if it's off.`, previous };
}

/** Puts back the look from before the last steal. */
export async function undoSteal(formData: FormData) {
  const user = await requireUser();
  let prev: Look;
  try { prev = JSON.parse(String(formData.get("previous") ?? "")); } catch { return; }
  const theme = THEMES.some((t) => t.id === prev?.theme) ? prev.theme : user.theme;
  await save(user.id, user.handle, { theme, style: sanitizeStyle(prev?.style ?? {}) });
}
