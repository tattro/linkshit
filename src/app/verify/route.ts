import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db, users } from "@/db";
import { consumeEmailToken } from "@/lib/auth";

export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token") ?? "";
  const userId = token ? await consumeEmailToken(token, "verify") : null;
  if (!userId) return NextResponse.redirect(new URL("/login?verify=expired", req.url));
  await db.update(users).set({ emailVerifiedAt: new Date() }).where(eq(users.id, userId));
  return NextResponse.redirect(new URL("/dashboard?verified=1", req.url));
}
