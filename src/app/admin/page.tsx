import { desc, eq, ilike, isNotNull, or, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import Link from "next/link";
import { db, links, offerRequests, offers, users } from "@/db";
import { decideOfferRequest, setOfferActive, setOfferAutoApprove } from "@/app/actions/marketplace";
import { OfferForm } from "./OfferForm";
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
  const offerRows = await db
    .select({
      id: offers.id, title: offers.title, advertiser: offers.advertiser, payout: offers.payout, category: offers.category,
      url: offers.url, active: offers.active, autoApprove: offers.autoApprove,
      added: sql<number>`(select count(*)::int from ${links} where ${links.offerId} = ${offers.id} and ${links.deletedAt} is null)`,
      clicks: sql<number>`(select coalesce(sum(${links.clicks}), 0)::int from ${links} where ${links.offerId} = ${offers.id})`,
    })
    .from(offers)
    .orderBy(desc(offers.createdAt));
  const pending = await db
    .select({ id: offerRequests.id, createdAt: offerRequests.createdAt, offer: offers.title, advertiser: offers.advertiser, handle: users.handle })
    .from(offerRequests)
    .innerJoin(offers, eq(offers.id, offerRequests.offerId))
    .innerJoin(users, eq(users.id, offerRequests.userId))
    .where(eq(offerRequests.status, "pending"))
    .orderBy(offerRequests.createdAt);
  const [rows, [stats]] = await Promise.all([
    db.select({
      id: users.id, handle: users.handle, email: sql<string>`coalesce(${users.email}, ${owner.email} || ' (extra page)')`, displayName: users.displayName, createdAt: users.createdAt,
      bannedAt: users.bannedAt, banReason: users.banReason, verified: users.emailVerifiedAt, tips: users.marketingOptInAt,
      linkCount: sql<number>`(select count(*)::int from ${links} where ${links.userId} = ${users.id})`,
    }).from(users).leftJoin(owner, eq(owner.id, users.ownerId)).where(where).orderBy(desc(users.createdAt)).limit(100),
    db.select({
      total: sql<number>`count(*) filter (where ${users.ownerId} is null)::int`,
      banned: sql<number>`count(${users.bannedAt})::int`,
      week: sql<number>`count(*) filter (where ${users.ownerId} is null and ${users.createdAt} > now() - interval '7 days')::int`,
      marketplace: sql<number>`count(${users.marketplaceInterestAt})::int`,
      // Double opt-in: ticked the box and confirmed the email
      tips: sql<number>`count(*) filter (where ${users.marketingOptInAt} is not null and ${users.emailVerifiedAt} is not null and ${users.bannedAt} is null)::int`,
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
              {stats.total.toLocaleString()} accounts · {stats.week.toLocaleString()} new this week · {stats.banned.toLocaleString()} banned · {stats.marketplace.toLocaleString()} open to advertisers · {stats.tips.toLocaleString()} on the tips list
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
                  <td className="px-4 py-3">{u.email}{u.verified && <span className="ml-1 text-lime-700" title="Email confirmed">✓</span>}
                    {u.tips && <span className="ml-1 rounded bg-stone-100 px-1 text-xs text-stone-600" title={u.verified ? "Wants tips and news (confirmed)" : "Ticked tips, email not confirmed yet"}>{u.verified ? "tips" : "tips?"}</span>}</td>
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

        <section className="space-y-4 rounded-2xl border-2 border-stone-900 bg-white p-6">
          <div>
            <h2 className="text-lg font-black">Marketplace offers</h2>
            <p className="text-sm text-stone-500">Active offers show up in every creator&apos;s Marketplace tab. Pausing one hides it from the Marketplace and from every page that added it.</p>
          </div>
          {pending.length > 0 && (
            <div className="rounded-xl border-2 border-amber-300 bg-amber-50 p-4">
              <h3 className="font-black">Waiting for approval ({pending.length})</h3>
              <ul className="mt-2 space-y-2 text-sm">
                {pending.map((r) => (
                  <li key={r.id} className="flex flex-wrap items-center justify-between gap-2">
                    <span>
                      <a href={`/${r.handle}`} target="_blank" className="font-mono font-semibold underline">@{r.handle}</a> wants{" "}
                      <span className="font-semibold">{r.offer}</span> <span className="text-stone-500">({r.advertiser})</span>
                    </span>
                    <span className="flex gap-2">
                      <form action={decideOfferRequest}>
                        <input type="hidden" name="id" value={r.id} />
                        <input type="hidden" name="approve" value="1" />
                        <button className="rounded bg-lime-300 px-2 py-1 font-semibold">Approve</button>
                      </form>
                      <form action={decideOfferRequest}>
                        <input type="hidden" name="id" value={r.id} />
                        <input type="hidden" name="approve" value="0" />
                        <button className="rounded border-2 border-stone-300 px-2 py-1 font-semibold">Decline</button>
                      </form>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <OfferForm />
          {offerRows.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-stone-500">
                  <tr>
                    <th className="py-2 pr-4 font-medium">Offer</th>
                    <th className="py-2 pr-4 font-medium">Payout</th>
                    <th className="py-2 pr-4 text-right font-medium">On pages</th>
                    <th className="py-2 pr-4 text-right font-medium">Clicks</th>
                    <th className="py-2 pr-4 font-medium">Approval</th>
                    <th className="py-2" />
                  </tr>
                </thead>
                <tbody>
                  {offerRows.map((o) => (
                    <tr key={o.id} className="border-t border-stone-100 align-top">
                      <td className="py-2 pr-4">
                        <div className="font-semibold">{o.title}</div>
                        <div className="text-xs text-stone-500">{o.advertiser}{o.category ? ` · ${o.category}` : ""}</div>
                        <div className="max-w-md truncate font-mono text-xs text-stone-500">{o.url}</div>
                      </td>
                      <td className="py-2 pr-4">{o.payout || "–"}</td>
                      <td className="py-2 pr-4 text-right tabular-nums">{o.added}</td>
                      <td className="py-2 pr-4 text-right tabular-nums">{o.clicks}</td>
                      <td className="py-2 pr-4">
                        <form action={setOfferAutoApprove}>
                          <input type="hidden" name="id" value={o.id} />
                          <input type="hidden" name="auto" value={o.autoApprove ? "0" : "1"} />
                          <button className="text-left underline decoration-stone-300 underline-offset-2" title="Click to switch">
                            {o.autoApprove ? "Auto" : "Manual"}
                          </button>
                        </form>
                      </td>
                      <td className="py-2">
                        <form action={setOfferActive}>
                          <input type="hidden" name="id" value={o.id} />
                          <input type="hidden" name="active" value={o.active ? "0" : "1"} />
                          <button className={`rounded px-2 py-1 font-semibold ${o.active ? "border-2 border-stone-300" : "bg-lime-300"}`}>
                            {o.active ? "Pause" : "Activate"}
                          </button>
                        </form>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export const instant = false;
