import { redirect } from "next/navigation";
import { joinMarketplaceWaitlist } from "@/app/actions/marketplace";
import { getSession } from "@/lib/auth";
import { DashboardHeader } from "../DashboardHeader";

export const metadata = { title: "Marketplace" };

const PERKS = [
  { icon: "🛍️", title: "Pick an offer", body: "Browse brands that actually fit your audience. No begging for sponsorships." },
  { icon: "➕", title: "One click to add it", body: "It drops straight onto your page as a link. Done." },
  { icon: "💸", title: "Get paid", body: "Your fans click and buy, you earn. Way better than the 3% Amazon tosses you." },
  { icon: "🙅", title: "We take nothing from you", body: "The brands pay us. You keep every cent you earn. Every. Single. Cent." },
];

export default async function Marketplace() {
  const s = await getSession();
  if (!s) redirect("/login");
  const joined = Boolean(s.account.marketplaceInterestAt);

  return (
    <div className="min-h-screen bg-stone-100 text-stone-900">
      <DashboardHeader active="marketplace" />
      <main className="mx-auto max-w-4xl space-y-8 px-6 py-12">
        <div className="rounded-3xl border-2 border-stone-900 bg-lime-300 p-8 text-center md:p-12">
          <span className="inline-block rounded-full bg-stone-900 px-3 py-1 text-xs font-black uppercase tracking-wide text-lime-300">Coming soon</span>
          <h1 className="mt-4 text-4xl font-black tracking-tight md:text-5xl">The linksh.it Marketplace</h1>
          <p className="mx-auto mt-4 max-w-xl text-lg font-semibold">
            We&apos;re going to help you make money, and you&apos;re going to give us none of it. 💩💰
          </p>
          <p className="mx-auto mt-4 max-w-xl text-stone-800">
            Tired of getting a 3% commission on an Amazon product you promoted? Let&apos;s make you more money with direct deals from advertisers, matched to your audience, right on your page.
          </p>
          <div className="mt-8">
            {joined ? (
              <p className="inline-block rounded-full bg-white px-6 py-3 font-bold">✅ You&apos;re on the list. We&apos;ll email you the second it&apos;s live.</p>
            ) : (
              <form action={joinMarketplaceWaitlist}>
                <button className="rounded-full bg-stone-900 px-8 py-4 font-bold text-white hover:bg-white hover:text-stone-900">
                  I&apos;m in. Show me the money.
                </button>
              </form>
            )}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {PERKS.map((p) => (
            <div key={p.title} className="rounded-2xl border-2 border-stone-900 bg-white p-6">
              <p className="text-3xl" aria-hidden>{p.icon}</p>
              <h2 className="mt-2 font-black">{p.title}</h2>
              <p className="mt-1 text-sm text-stone-600">{p.body}</p>
            </div>
          ))}
        </div>
        <p className="text-center text-sm text-stone-500">
          BTW, this is totally optional. Just want a page for your links? Cool. No big deal.
        </p>
      </main>
    </div>
  );
}

export const instant = false;
