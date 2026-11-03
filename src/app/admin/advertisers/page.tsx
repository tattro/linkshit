import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { HOLD_DAYS, LINKSHIT_CUT } from "./data";

const card = "rounded-2xl border-2 border-stone-900 bg-white p-5";

export default async function HowItWorks() {
  await requireAdmin();
  const steps: [string, string, string][] = [
    ["💳", "Advertiser signs up and adds a deposit", "Commissions come out of it, so we never chase invoices."],
    ["🔎", "They pick creators", "Only creators who ticked \"open to advertisers\". Real stats we track, follower counts the creator enters, and links to check them."],
    ["🎯", "They set the rules", "Niche, countries, minimum clicks, no 18+ pages, payout per sale, dates, budget. Auto-approve creators or review each one."],
    ["🔗", "Creators add the offer", "It shows as a button on their page with the disclosure \"Ad\" always on."],
    ["✅", "A sale happens", "The advertiser's site pings our postback URL with the creator's ID. No sale, no charge."],
    ["⏳", `${HOLD_DAYS}-day hold`, "Commission waits in case of a refund, then the creator gets paid and linksh.it keeps its cut."],
  ];
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black">Like hiring an influencer, but you only pay per sale.</h1>
        <p className="mt-1 text-stone-600">Advertisers sign up once with Vyamp. Their offers can run on linksh.it creator pages here, and later on Cash Claps and Vyamp influencers. linksh.it pages stay fully linksh.it-branded.</p>
      </div>

      <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {steps.map(([icon, title, body], i) => (
          <li key={title} className={card}>
            <p className="text-2xl" aria-hidden>{icon}</p>
            <p className="mt-2 font-bold">{i + 1}. {title}</p>
            <p className="mt-1 text-sm text-stone-600">{body}</p>
          </li>
        ))}
      </ol>

      <section className={card}>
        <h2 className="text-lg font-black">Where the money goes (one $40 sale)</h2>
        <div className="mt-3 grid grid-cols-3 gap-2 text-center text-sm">
          <div className="rounded-xl bg-stone-100 p-3"><p className="text-2xl font-black">$40.00</p><p className="text-stone-600">from the deposit</p></div>
          <div className="rounded-xl bg-lime-100 p-3"><p className="text-2xl font-black">${(40 * (1 - LINKSHIT_CUT)).toFixed(2)}</p><p className="text-stone-600">to the creator</p></div>
          <div className="rounded-xl bg-amber-100 p-3"><p className="text-2xl font-black">${(40 * LINKSHIT_CUT).toFixed(2)}</p><p className="text-stone-600">to linksh.it ({LINKSHIT_CUT * 100}%)</p></div>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        <div className={card}>
          <p className="text-sm font-bold uppercase tracking-wide text-stone-500">Free · launch</p>
          <p className="mt-1 text-2xl font-black">$0/month</p>
          <ul className="mt-3 space-y-1 text-sm">
            <li>✓ Pay per sale only</li><li>✓ List offers in the Marketplace</li><li>✓ Basic creator search</li><li>✓ Results dashboard</li>
          </ul>
        </div>
        <div className={`${card} relative opacity-80`}>
          <span className="absolute right-4 top-4 rounded-full bg-stone-900 px-2 py-0.5 text-xs font-bold text-white">Later · off</span>
          <p className="text-sm font-bold uppercase tracking-wide text-stone-500">Vyamp access</p>
          <p className="mt-1 text-2xl font-black">~$100/month</p>
          <ul className="mt-3 space-y-1 text-sm">
            <li>✓ Everything in Free</li><li>✓ Every Vyamp property: linksh.it, Cash Claps</li><li>✓ Influencers, AI influencers and clippers</li><li>✓ Invite creators directly, full stats</li><li>✓ Still pay per sale on top</li>
          </ul>
          <p className="mt-3 text-xs text-stone-500">Charged by Vyamp, not per property. Turn on once Vyamp is big enough.</p>
        </div>
      </section>

      <Link href="/admin/advertisers/signup" className="inline-block rounded-full bg-stone-900 px-5 py-3 font-bold text-white">Walk through it as an advertiser →</Link>
    </div>
  );
}

export const instant = false;
