import { redirect } from "next/navigation";
import { joinMarketplaceWaitlist } from "@/app/actions/marketplace";
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
  const joined = Boolean(s.account.marketplaceInterestAt);

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
      </main>
    </div>
  );
}

export const instant = false;
