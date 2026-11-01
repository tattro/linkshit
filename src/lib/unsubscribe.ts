import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

const secret = () => process.env.CRON_SECRET || "";

const sign = (userId: number) => createHmac("sha256", secret()).update(`unsub:${userId}`).digest("base64url");

export const unsubscribeUrl = (base: string, userId: number) => `${base}/unsubscribe?u=${userId}&t=${sign(userId)}`;

/** For the List-Unsubscribe header: mail apps POST here for one-click unsubscribe. */
export const oneClickUrl = (base: string, userId: number) => `${base}/api/unsubscribe?u=${userId}&t=${sign(userId)}`;

/** Returns the user id if the link's signature checks out. */
export function verifyUnsubscribe(u: unknown, t: unknown): number | null {
  const userId = Number(u);
  if (!secret() || !Number.isInteger(userId) || typeof t !== "string") return null;
  const a = Buffer.from(t);
  const b = Buffer.from(sign(userId));
  return a.length === b.length && timingSafeEqual(a, b) ? userId : null;
}
