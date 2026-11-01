import { desc, eq, ilike, isNotNull, or, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import Link from "next/link";
import { db, links, users } from "@/db";
import { setBan } from "@/app/actions/admin";
import { requireAdmin } from "@/lib/auth";
import { DashboardHeader } from "../dashboard/DashboardHeader";

export const metadata = { title: "Admin" };

export default async function AdminPage({ searchParams }: PageProps<"/admin">) {
  const admin = await requireAdmin();
  const { q, banned } = await searchParams;
  const query = typeof q === "string" ? q.trim().slice(0, 100) : "";
  const onlyBanned = banned === "1";

  const where = onlyBanned
    ? isNotNull(users.bannedAt)
    : query
      ? or(ilike(users.handle, `%${query}%`), ilike(users.email, `%${query}%`), ilike(users.displayName, `%${query}%`))
      : undefined;

  const owner = alias(users, "owner");
  const [rows, [stats]] = await Promise.all([
    db.select({
      id: users.id, handle: users.handle, email: sql<string>`coalesce(${users.email}, ${owner.email} || ' (extra page)')`, displayName: users.displayName, createdAt: users.createdAt,
      bannedAt: users.bannedAt, banReason: users.banReason, verified: users.emailVerifiedAt,
      linkCount: sql<number>`(select count(*)::int from ${links} where ${links.userId} = ${users.id})`,
    }).from(users).leftJoin(owner, eq(owner.id, users.ownerId)).where(where).orderBy(desc(users.createdAt)).limit(100),
    db.select({
      total: sql<number>`count(*) filter (where ${users.ownerId} is null)::int`,
      banned: sql<number>`count(${users.bannedAt})::int`,
      week: sql<number>`count(*) filter (where ${users.ownerId} is null and ${users.createdAt} > now() - interval '7 days')::int`,
      marketplace: sql<number>`count(${users.marketplaceInterestAt})::int`,
    }).from(users),
  ]);

  return (
    <div className="min-h-screen bg-stone-100 text-stone-900">
      <DashboardHeader active="admin" />
      <main className="mx-auto max-w-6xl space-y-6 px-6 py-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black">Admin</h1>
            <p className="text-sm text-stone-500">
              {stats.total.toLocaleString()} accounts · {stats.week.toLocaleString()} new this week · {stats.banned.toLocaleString()} banned · {stats.marketplace.toLocaleString()} on the marketplace waitlist
            </p>
          </div>
          <form className="flex gap-2">
            <input name="q" defaultValue={query} placeholder="Search handle, name or email" className="w-64 rounded-lg border-2 border-stone-300 bg-white px-3 py-2 outline-none focus:border-stone-900" />
            <button className="rounded-lg bg-stone-900 px-4 py-2 font-semibold text-white">Search</button>
            <Link href={onlyBanned ? "/admin" : "/admin?banned=1"} className="rounded-lg border-2 border-stone-300 px-3 py-2 text-sm font-semibold">
              {onlyBanned ? "All accounts" : "Banned only"}
            </Link>
          </form>
        </div>

        <div className="overflow-x-auto rounded-2xl border-2 border-stone-900 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-stone-50 text-stone-500">
              <tr>
                <th className="px-4 py-3 font-medium">Handle</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 text-right font-medium">Links</th>
                <th className="px-4 py-3 font-medium">Joined</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {rows.map((u) => (
                <tr key={u.id} className="border-t border-stone-100 align-top">
                  <td className="px-4 py-3">
                    <a href={`/${u.handle}`} target="_blank" className="font-mono font-semibold underline">@{u.handle}</a>
                    <div className="text-stone-500">{u.displayName}</div>
                  </td>
                  <td className="px-4 py-3">{u.email}{u.verified && <span className="ml-1 text-lime-700" title="Email confirmed">✓</span>}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{u.linkCount}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{u.createdAt.toISOString().slice(0, 10)}</td>
                  <td className="px-4 py-3">
                    {u.bannedAt ? (
                      <span className="rounded bg-red-100 px-1.5 py-0.5 text-red-800" title={u.banReason ?? undefined}>Banned{u.banReason ? `: ${u.banReason}` : ""}</span>
                    ) : (
                      <span className="text-stone-500">Active</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {u.id !== admin.id && (
                      <form action={setBan} className="flex gap-2">
                        <input type="hidden" name="id" value={u.id} />
                        <input type="hidden" name="ban" value={u.bannedAt ? "0" : "1"} />
                        {!u.bannedAt && <input name="reason" placeholder="Reason (optional)" className="w-36 rounded border border-stone-300 px-2 py-1" />}
                        <button className={`rounded px-2 py-1 font-semibold ${u.bannedAt ? "border-2 border-stone-300" : "bg-red-600 text-white"}`}>
                          {u.bannedAt ? "Unban" : "Ban"}
                        </button>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-stone-500">Nobody matches that.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="text-sm text-stone-500">Banning hides the page, kills their sessions, and blocks login. Showing the newest 100 matches.</p>
      </main>
    </div>
  );
}

export const instant = false;
