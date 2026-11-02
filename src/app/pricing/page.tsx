import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { SiteFooter } from "@/components/SiteFooter";

export const metadata: Metadata = {
  title: "Pricing: free · linksh.it",
  description: "The link-in-bio features other sites charge monthly for, free on linksh.it. No subscriptions, ever.",
};

// The stuff other link-in-bio sites keep behind a monthly plan.
const PAID_ELSEWHERE: [string, string][] = [
  ["Full click & visitor analytics", "Where they came from, what they tapped, weekly email recap."],
  ["Scheduled links & drop countdowns", "Links that show up (or count down) on their own."],
  ["Email list signups + CSV download", "Collect fans' emails and take them anywhere."],
  ["Meta Pixel, Google Analytics, TikTok Pixel", "Retarget your visitors like the big kids."],
  ["Custom colors, gradients, fonts & background photos", "Make it look like you, not a template."],
  ["Spotlight animations", "The link that wiggles until they tap it."],
  ["Locked links, 18+ gates & page lock", "Secret drops for the people with the code."],
  ["Booking calendars & music players on the page", "Calendly, Cal.com, Spotify, Apple Music, YouTube, SoundCloud."],
  ["Contact form & anonymous Q&A", "Fans reach you without getting your email."],
  ["Tip jar & discount codes", "Venmo, Cash App, PayPal, Stripe. Tap to copy codes."],
  ["Multiple pages on one login", "One for the band, one for the side hustle."],
  ["Opens links in the app, not the in-app browser", "So people stay logged in and actually follow you."],
];

export default function Pricing() {
  return (
    <div className="min-h-screen bg-stone-100 text-stone-900">
      <header className="mx-auto flex max-w-5xl items-center justify-between p-6">
        <Logo />
        <Link href="/signup" className="rounded-full bg-stone-900 px-4 py-2 text-sm font-medium text-white">Sign up</Link>
      </header>

      <main className="mx-auto max-w-3xl px-6 pb-24 pt-6">
        <h1 className="text-4xl font-black leading-[1.05] tracking-tight md:text-6xl">
          Their premium plan.<br />
          <span className="bg-lime-300 px-2">Our free plan.</span>
        </h1>
        <p className="mt-6 max-w-xl text-lg text-stone-600">
          Linktree, Beacons and the rest put the good stuff behind a monthly subscription. We don&apos;t have subscriptions.
          Every feature on linksh.it is free, for everyone, forever.
        </p>

        <div className="mt-10 overflow-hidden rounded-3xl border-2 border-stone-900 bg-white">
          <div className="grid grid-cols-[1fr_auto_auto] items-center gap-x-3 border-b-2 border-stone-900 bg-stone-900 px-4 py-3 text-xs font-bold uppercase tracking-wider text-white sm:gap-x-6 sm:px-6">
            <span>Feature</span>
            <span className="w-16 text-center sm:w-24">Others</span>
            <span className="w-16 text-center text-lime-300 sm:w-24">linksh.it</span>
          </div>
          <ul className="divide-y divide-stone-100">
            {PAID_ELSEWHERE.map(([feature, note]) => (
              <li key={feature} className="grid grid-cols-[1fr_auto_auto] items-center gap-x-3 px-4 py-4 sm:gap-x-6 sm:px-6">
                <span className="min-w-0">
                  <span className="block font-bold">{feature}</span>
                  <span className="block text-sm text-stone-500">{note}</span>
                </span>
                <span className="w-16 text-center text-xs font-semibold text-stone-500 sm:w-24">Paid plan</span>
                <span className="w-16 text-center sm:w-24">
                  <span className="inline-block rounded-full bg-lime-300 px-2.5 py-1 text-xs font-black">FREE</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
        <p className="mt-3 text-xs text-stone-400">
          &ldquo;Others&rdquo; means features that one or more big link-in-bio sites limit to paid plans, or don&apos;t offer at all. Their plans change, so check theirs.
        </p>

        <section className="mt-16">
          <h2 className="text-3xl font-black tracking-tight">So how do you make money?</h2>
          <div className="mt-4 space-y-4 text-lg text-stone-700">
            <p>
              The <strong>Marketplace</strong>. Brands pay to be seen by your audience, and creators who opt in get paid to feature
              products they actually like. It&apos;s optional. Don&apos;t want it? Don&apos;t turn it on. Your page stays free either way.
            </p>
            <p>
              No subscriptions, no &ldquo;upgrade to unlock&rdquo;, no surprise paywall the day you get popular.
            </p>
          </div>
        </section>

        <section className="mt-16 rounded-3xl border-2 border-stone-900 bg-lime-300 p-8 text-center">
          <h2 className="text-3xl font-black tracking-tight">Already on Linktree?</h2>
          <p className="mt-2 text-stone-800">Paste your Linktree link after you sign up and we copy your links, bio and look over in seconds.</p>
          <Link href="/signup" className="mt-6 inline-block rounded-full bg-stone-900 px-8 py-4 font-bold text-white hover:bg-white hover:text-stone-900">
            Claim my linksh.it, free
          </Link>
        </section>
      </main>

      <SiteFooter creator />
    </div>
  );
}
