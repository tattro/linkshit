import { asc, eq } from "drizzle-orm";
import { db, subscribers } from "@/db";
import { getCurrentUser } from "@/lib/auth";

// Downloads the logged-in user's email list as CSV.
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return new Response("Log in first.", { status: 401 });
  const rows = await db
    .select({ email: subscribers.email, createdAt: subscribers.createdAt })
    .from(subscribers)
    .where(eq(subscribers.userId, user.id))
    .orderBy(asc(subscribers.createdAt));
  // Quote every field, and defuse spreadsheet formulas.
  const cell = (v: string) => `"${(/^[=+\-@]/.test(v) ? `'${v}` : v).replace(/"/g, '""')}"`;
  const csv = ["email,subscribed_at", ...rows.map((r) => `${cell(r.email)},${cell(r.createdAt.toISOString())}`)].join("\r\n");
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="linksh.it-${user.handle}-subscribers.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
