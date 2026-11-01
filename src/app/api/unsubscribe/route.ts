import { eq } from "drizzle-orm";
import { db, users } from "@/db";
import { verifyUnsubscribe } from "@/lib/unsubscribe";

// One-click unsubscribe (RFC 8058) from the mail app's own button
export async function POST(req: Request) {
  const url = new URL(req.url);
  const userId = verifyUnsubscribe(url.searchParams.get("u"), url.searchParams.get("t"));
  if (!userId) return new Response("Bad link", { status: 400 });
  await db.update(users).set({ weeklyEmail: false }).where(eq(users.id, userId));
  return new Response("Unsubscribed", { status: 200 });
}
