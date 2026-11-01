import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

// Code locks for pages and links. Unlocking sets a cookie signed with the code itself,
// so changing the code locks everyone out again.

export type LockKind = "page" | "link";

export const lockCookie = (kind: LockKind, id: number) => `lk_${kind[0]}${id}`;

export const lockToken = (kind: LockKind, id: number, code: string) =>
  createHmac("sha256", process.env.CRON_SECRET || "linksh.it").update(`lock:${kind}:${id}:${code}`).digest("base64url");

export function tokenMatches(token: string | undefined, kind: LockKind, id: number, code: string) {
  if (!token) return false;
  const a = Buffer.from(token);
  const b = Buffer.from(lockToken(kind, id, code));
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Codes are compared loosely: case and spaces don't matter. */
export const sameCode = (typed: string, code: string) =>
  typed.trim().toLowerCase().replace(/\s+/g, "") === code.trim().toLowerCase().replace(/\s+/g, "");

/** Cleans a code typed in the dashboard. Empty means no lock. */
export function cleanCode(raw: FormDataEntryValue | null): string | null {
  const v = String(raw ?? "").trim().slice(0, 40);
  return v ? v : null;
}

export const LOCK_MAX_AGE = 60 * 60 * 24 * 30;
