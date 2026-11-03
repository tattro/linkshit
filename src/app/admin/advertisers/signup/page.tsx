import Link from "next/link";
import { requireAdmin } from "@/lib/auth";

const input = "w-full rounded-lg border-2 border-stone-300 bg-white px-3 py-2 outline-none focus:border-stone-900";

/** Mock of the advertiser sign-up. The form doesn't submit anywhere yet. */
export default async function AdvertiserSignup() {
  await requireAdmin();
  return (
    <div className="mx-auto max-w-md space-y-4">
      <div className="text-center">
        <p className="text-sm font-black uppercase tracking-widest text-stone-500">Vyamp for advertisers</p>
        <h1 className="text-3xl font-black">Get your product on creators&apos; pages.</h1>
        <p className="mt-1 text-stone-600">Pay only when someone buys. No monthly fee.</p>
      </div>
      <div className="space-y-3 rounded-2xl border-2 border-stone-900 bg-white p-5">
        <label className="block text-sm font-semibold">Company name<input className={`${input} mt-1`} placeholder="Acme Therapy Co." /></label>
        <label className="block text-sm font-semibold">Website<input className={`${input} mt-1`} placeholder="acme.com" /></label>
        <label className="block text-sm font-semibold">Work email<input type="email" className={`${input} mt-1`} placeholder="you@acme.com" /></label>
        <label className="block text-sm font-semibold">Password<input type="password" className={`${input} mt-1`} /></label>
        <label className="block text-sm font-semibold">What do you sell?
          <select className={`${input} mt-1`} defaultValue="">
            <option value="" disabled>Pick one</option>
            <option>Health &amp; wellness</option><option>Apps &amp; software</option><option>Courses &amp; education</option>
            <option>Fashion &amp; beauty</option><option>Finance</option><option>Food &amp; drink</option><option>Music gear</option><option>Something else</option>
          </select>
        </label>
        <label className="flex items-start gap-2 text-sm"><input type="checkbox" className="mt-1" /> I agree to the advertiser terms, and every offer will be marked as an ad.</label>
        <Link href="/admin/advertisers/creators" className="block rounded-full bg-stone-900 py-3 text-center font-bold text-white">Create advertiser account</Link>
        <p className="text-center text-xs text-stone-500">A Vyamp account, separate from linksh.it creator accounts. One account runs offers on every Vyamp property. We&apos;d confirm the email and check the website before offers go live.</p>
      </div>
      <p className="text-center text-sm">Already advertising? <span className="font-semibold underline">Log in</span></p>
    </div>
  );
}

export const instant = false;
