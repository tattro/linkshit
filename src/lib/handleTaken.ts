import "server-only";
import { and, eq, gt, ne } from "drizzle-orm";
import { db, handleRedirects, users } from "@/db";

/** How long a renamed handle keeps pointing at its old owner before anyone can claim it. */
export const REDIRECT_DAYS = 30;
export const redirectCutoff = () => new Date(Date.now() - REDIRECT_DAYS * 86_400_000);

/** True if someone else owns the handle, or recently renamed away from it. */
export async function handleTaken(handle: string, exceptUserId?: number): Promise<boolean> {
  const [user] = await db.select({ id: users.id }).from(users)
    .where(exceptUserId ? and(eq(users.handle, handle), ne(users.id, exceptUserId)) : eq(users.handle, handle));
  if (user) return true;
  const [redirect] = await db.select({ userId: handleRedirects.userId }).from(handleRedirects)
    .where(and(eq(handleRedirects.handle, handle), gt(handleRedirects.createdAt, redirectCutoff())));
  return Boolean(redirect && redirect.userId !== exceptUserId);
}
