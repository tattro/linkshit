import "server-only";
import { lt, sql } from "drizzle-orm";
import { db, rateLimits } from "@/db";

/**
 * Fixed-window rate limit backed by Postgres. Returns true if the action is allowed.
 * `key` should include the action and who is doing it, e.g. `login:ip:1.2.3.4`.
 */
export async function rateLimit(key: string, limit: number, windowSeconds: number): Promise<boolean> {
  const now = Date.now();
  const windowStart = new Date(now - (now % (windowSeconds * 1000)));
  const [row] = await db
    .insert(rateLimits)
    .values({ key, windowStart, count: 1 })
    .onConflictDoUpdate({ target: [rateLimits.key, rateLimits.windowStart], set: { count: sql`${rateLimits.count} + 1` } })
    .returning({ count: rateLimits.count });
  // Occasionally sweep old windows so the table stays small
  if (Math.random() < 0.02) {
    await db.delete(rateLimits).where(lt(rateLimits.windowStart, new Date(now - 24 * 60 * 60 * 1000)));
  }
  return row.count <= limit;
}

export const TOO_MANY = "Whoa, slow down. Too many tries, give it a few minutes.";
