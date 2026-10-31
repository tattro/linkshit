import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db, users } from "@/db";
import { handleProblem, normalizeHandle } from "@/lib/handles";

export async function GET(req: Request) {
  const handle = normalizeHandle(new URL(req.url).searchParams.get("h") ?? "");
  const problem = handleProblem(handle);
  if (problem) return NextResponse.json({ handle, available: false, reason: problem });
  const [taken] = await db.select({ id: users.id }).from(users).where(eq(users.handle, handle));
  return NextResponse.json({
    handle,
    available: !taken,
    reason: taken ? "Already claimed. Someone beat you to it." : null,
  });
}
