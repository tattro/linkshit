import { NextResponse } from "next/server";
import { handleTaken } from "@/lib/handleTaken";
import { handleProblem, normalizeHandle } from "@/lib/handles";

export async function GET(req: Request) {
  const handle = normalizeHandle(new URL(req.url).searchParams.get("h") ?? "");
  const problem = handleProblem(handle);
  if (problem) return NextResponse.json({ handle, available: false, reason: problem });
  const taken = await handleTaken(handle);
  return NextResponse.json({
    handle,
    available: !taken,
    reason: taken ? "Already claimed. Someone beat you to it." : null,
  });
}
