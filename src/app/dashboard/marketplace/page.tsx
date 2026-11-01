import { and, desc, eq, isNull } from "drizzle-orm";
import { redirect } from "next/navigation";
import { addOffer, joinMarketplaceWaitlist, removeOffer } from "@/app/actions/marketplace";
import { db, links, offerRequests, offers } from "@/db";
import { getSession } from "@/lib/auth";
import { DashboardHeader } from "../DashboardHeader";

export const metadata = { title: "Marketplace" };

const PERKS = [
  { icon: "🎯", title: "Matched to your niche", body: "Offers from advertisers in the same world as the content you make. No random junk." },
  { icon: "💸", title: "The best payouts", body: "We negotiate with advertisers directly, so you earn way more than the 3% Amazon tosses you." },
  { icon: "🤝", title: "Not an ad, a referral", body: "It's a product that fits what you already talk about. You earn a commission for everyone who signs up." },
  { icon: "🙌", title: "Completely optional", body: "Don't want it? Don't use it. Your page works exactly the same either way." },
];

export default async function Marketplace() {
  const s = await getSession();
  if (!s) redirect("/login");
  const { account, page } = s;
  const joined = Boolean(account.marketplaceInterestAt);

  const [list, mine, requests] = await Promise.all([
    db.select().from(offers).where(eq(offers.active, true)).orderBy(desc(offers.createdAt)),
    db.select({ offerId: links.offerId }).from(links).where(and(eq(links.userId, page.id), isNull(links.deletedAt))),
    db.select({ offerId: offerRequests.offerId, status: offerRequests.status }).from(offerRequests).where(eq(offerRequests.userId, page.id)),
  ]);
  const onPage = new Set(mine.map((m) => m.offerId).filter(Boolean));
  const statusOf = (id: number) => requests.find((r) => r.offerId === id)?.status;

  return (
    <div className="min-h-screen bg-stone-100 text-stone-900">
      <DashboardHeader active="marketplace" />
      <main className="mx-auto max-w-4xl space-y-8 px-6 py-12">
        <div className="rounded-3xl border-2 border-stone-900 bg-lime-300 p-8 text-center md:p-12">
          <span className="inline-block rounded-full bg-stone-900 px-3 py-1 text-xs font-black uppercase tracking-wide text-lime-300">Beta</span>
          <h1 className="mt-4 text-4xl font-black tracking-tight md:text-5xl">Marketplace</h1>
          <p className="mx-auto mt-4 max-w-xl text-lg font-semibold">
            A way to monetize your link in bio, with the best payouts from advertisers in your niche.
          </p>
          <p className="mx-auto mt-5 inline-block rounded-2xl bg-stone-900 px-5 py-3 text-lg font-black text-lime-300">
            You don&apos;t pay for linksh.it. No subscription fees.<br />But you might get paid by us. 💸
          </p>
          <p className="mx-auto mt-4 max-w-xl text-stone-800">
            It&apos;s not an ad. It&apos;s a referral to a product that fits the stuff you talk about, and you get paid a commission for everyone who signs up.
          </p>
          <p className="mx-auto mt-3 max-w-xl text-sm text-stone-700">
            This is in beta testing. We&apos;re building it out with advertisers right now. BTW, it&apos;s completely optional.
          </p>
          {list.length === 0 && (
            <div className="mt-8">
              {joined ? (
                <p className="inline-block rounded-full bg-white px-6 py-3 font-bold">✅ You&apos;re on the beta list. We&apos;ll email you when offers are ready.</p>
              ) : (
                <form action={joinMarketplaceWaitlist}>
                  <button className="rounded-full bg-stone-900 px-8 py-4 font-bold text-white hover:bg-white hover:text-stone-900">
                    I&apos;m in. Let me know when it&apos;s ready.
                  </button>
                </form>
              )}
            </div>
          )}
        </div>

        {list.length > 0 && (
          <section className="space-y-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-2xl font-black">Offers</h2>
              <p className="text-sm text-stone-500">Adding to <span className="font-mono font-semibold text-stone-900">linksh.it/{page.handle}</span></p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {list.map((o) => {
                const added = onPage.has(o.id);
                const status = statusOf(o.id);
                return (
                  <div key={o.id} className="flex flex-col rounded-2xl border-2 border-stone-900 bg-white p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold uppercase tracking-wide text-stone-500">{o.advertiser}{o.category ? ` · ${o.category}` : ""}</p>
                        <h3 className="mt-1 font-black">{o.icon && <span className="mr-1">{o.icon}</span>}{o.title}</h3>
                      </div>
                      {o.payout && <span className="shrink-0 rounded-full bg-lime-300 px-2.5 py-1 text-xs font-black">{o.payout}</span>}
                    </div>
                    {o.description && <p className="mt-2 text-sm text-stone-600">{o.description}</p>}
                    <div className="mt-auto pt-4">
                      {added ? (
                        <form action={removeOffer} className="flex items-center gap-3">
                          <input type="hidden" name="offerId" value={o.id} />
                          <span className="font-semibold text-lime-700">✓ On your page</span>
                          <button className="text-sm text-stone-500 underline hover:text-stone-900">Remove</button>
                        </form>
                      ) : status === "pending" ? (
                        <p className="font-semibold text-amber-700">⏳ Requested. Waiting on {o.advertiser}.</p>
                      ) : status === "declined" ? (
                        <p className="text-sm text-stone-500">{o.advertiser} passed on this one.</p>
                      ) : (
                        <form action={addOffer}>
                          <input type="hidden" name="offerId" value={o.id} />
                          <button className="rounded-full bg-stone-900 px-5 py-2.5 font-bold text-white hover:bg-lime-500 hover:text-stone-900">
                            {o.autoApprove || status === "approved" ? "I want this. Add it to my page" : "Request this offer"}
                          </button>
                        </form>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        <section className="rounded-2xl border-2 border-stone-900 bg-white p-6 md:p-8">
          <h2 className="text-xl font-black">How it shows up on your page</h2>
          <p className="mt-2 text-stone-700">
            If you decide to work with an advertiser: it&apos;s not a pop-up, it&apos;s not an annoying ad, and it doesn&apos;t take away from your brand.
            It&apos;s just another link at the very bottom of your page, if you want it there.
          </p>
          <div aria-hidden className="mx-auto mt-6 max-w-xs space-y-3 rounded-3xl bg-stone-100 p-5">
            <div className="rounded-xl bg-white py-3 text-center text-sm font-semibold shadow-sm">My new single 🎵</div>
            <div className="rounded-xl bg-white py-3 text-center text-sm font-semibold shadow-sm">Merch</div>
            <div>
              <div className="rounded-xl bg-white py-3 text-center text-sm font-semibold shadow-sm">🎧 Get 50% off studio headphones</div>
              <p className="mt-1 text-center text-[11px] text-stone-500">Affiliate link · I may earn a commission if you buy or sign up</p>
            </div>
          </div>
          <p className="mt-4 text-center text-xs text-stone-500">That little line keeps you FTC compliant. We add it for you automatically.</p>
        </section>

        <div className="grid gap-4 sm:grid-cols-2">
          {PERKS.map((p) => (
            <div key={p.title} className="rounded-2xl border-2 border-stone-900 bg-white p-6">
              <p className="text-3xl" aria-hidden>{p.icon}</p>
              <h2 className="mt-2 font-black">{p.title}</h2>
              <p className="mt-1 text-sm text-stone-600">{p.body}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

export const instant = false;
