"use client";

import Link from "next/link";
import { useState } from "react";

type C = { niche: string; countries: string[]; clicks30: number; adult: boolean };
const COUNTRIES = [["US", "United States"], ["GB", "UK"], ["CA", "Canada"], ["AU", "Australia"], ["DE", "Germany"], ["BR", "Brazil"], ["MX", "Mexico"]] as const;
const input = "w-full rounded-lg border-2 border-stone-300 bg-white px-3 py-2 outline-none focus:border-stone-900";
const box = "space-y-3 rounded-2xl border-2 border-stone-900 bg-white p-4";

export function OfferBuilder({ creators, niches }: { creators: C[]; niches: [string, string][] }) {
  const [button, setButton] = useState("Try 1 week of therapy free");
  const [payout, setPayout] = useState(40);
  const [budget, setBudget] = useState(2000);
  const [picked, setPicked] = useState<string[]>([]);
  const [countries, setCountries] = useState<string[]>(["US"]);
  const [min, setMin] = useState(1000);
  const [noAdult, setNoAdult] = useState(true);
  const [review, setReview] = useState(false);

  const toggle = (list: string[], set: (v: string[]) => void, v: string) => set(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  const match = creators.filter((c) =>
    (!picked.length || picked.includes(c.niche)) && (!countries.length || c.countries.some((x) => countries.includes(x))) && c.clicks30 >= min && !(noAdult && c.adult),
  ).length;
  const maxSales = payout > 0 ? Math.floor(budget / payout) : 0;

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_20rem]">
      <div className="space-y-4">
        <section className={box}>
          <h2 className="font-black">The offer</h2>
          <label className="block text-sm font-semibold">Product<input className={`${input} mt-1`} defaultValue="Acme Therapy, online sessions" /></label>
          <label className="block text-sm font-semibold">Landing page<input className={`${input} mt-1`} defaultValue="https://acme.com/start" /></label>
          <label className="block text-sm font-semibold">Button text on creators&apos; pages<input className={`${input} mt-1`} value={button} maxLength={60} onChange={(e) => setButton(e.target.value)} /></label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm font-semibold">You pay per sale ($)<input type="number" min={1} className={`${input} mt-1`} value={payout} onChange={(e) => setPayout(Number(e.target.value))} /></label>
            <label className="block text-sm font-semibold">Total budget ($)<input type="number" min={0} className={`${input} mt-1`} value={budget} onChange={(e) => setBudget(Number(e.target.value))} /></label>
            <label className="block text-sm font-semibold">Starts<input type="date" className={`${input} mt-1`} /></label>
            <label className="block text-sm font-semibold">Ends (optional)<input type="date" className={`${input} mt-1`} /></label>
          </div>
        </section>

        <section className={box}>
          <h2 className="font-black">Who can promote it</h2>
          <fieldset><legend className="text-sm font-semibold">Niches (none picked = any)</legend>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {niches.map(([k, label]) => (
                <button key={k} type="button" aria-pressed={picked.includes(k)} onClick={() => toggle(picked, setPicked, k)}
                  className={`rounded-full border-2 px-3 py-1 text-sm ${picked.includes(k) ? "border-stone-900 bg-stone-900 text-white" : "border-stone-300"}`}>{label}</button>
              ))}
            </div>
          </fieldset>
          <fieldset><legend className="text-sm font-semibold">Audience in (none picked = anywhere)</legend>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {COUNTRIES.map(([k, label]) => (
                <button key={k} type="button" aria-pressed={countries.includes(k)} onClick={() => toggle(countries, setCountries, k)}
                  className={`rounded-full border-2 px-3 py-1 text-sm ${countries.includes(k) ? "border-stone-900 bg-stone-900 text-white" : "border-stone-300"}`}>{label}</button>
              ))}
            </div>
          </fieldset>
          <label className="block text-sm font-semibold">At least this many clicks a month
            <select className={`${input} mt-1`} value={min} onChange={(e) => setMin(Number(e.target.value))}>
              {[0, 1000, 5000, 10000, 25000].map((n) => <option key={n} value={n}>{n ? n.toLocaleString() : "No minimum"}</option>)}
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={noAdult} onChange={(e) => setNoAdult(e.target.checked)} /> Skip pages with 18+ links</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={review} onChange={(e) => setReview(e.target.checked)} /> Let me approve each creator first</label>
          <fieldset className="border-t border-stone-200 pt-3"><legend className="text-sm font-semibold">Where it can run</legend>
            <label className="mt-1 flex items-center gap-2 text-sm"><input type="checkbox" defaultChecked /> linksh.it creator pages</label>
            <label className="flex items-center gap-2 text-sm text-stone-500"><input type="checkbox" disabled /> Cash Claps (people earn a reward for signing up). Coming later</label>
            <label className="flex items-center gap-2 text-sm text-stone-500"><input type="checkbox" disabled /> Vyamp influencers, AI influencers and clippers. Coming later</label>
          </fieldset>
          <label className="flex items-center gap-2 text-sm text-stone-500"><input type="checkbox" checked disabled /> Show &ldquo;Ad&rdquo; on the button (always on, required by law)</label>
        </section>
      </div>

      <aside className="space-y-4 lg:sticky lg:top-4 lg:self-start">
        <section className={box}>
          <h2 className="font-black">How it looks on a page</h2>
          <div className="rounded-xl bg-stone-100 p-3">
            <div className="relative rounded-xl border-2 border-stone-900 bg-white px-4 py-3 text-center font-semibold">
              {button || "Your button"}
              <span className="absolute right-2 top-1/2 -translate-y-1/2 rounded bg-stone-200 px-1.5 text-[10px] font-bold text-stone-600">Ad</span>
            </div>
          </div>
        </section>
        <section className={box}>
          <p className="text-3xl font-black">{match}</p>
          <p className="-mt-2 text-sm text-stone-600">creators match{review ? ", and you approve each one" : ", and they can add it right away"}</p>
          <dl className="space-y-1 border-t border-stone-200 pt-3 text-sm">
            <div className="flex justify-between"><dt>Creator gets per sale</dt><dd className="font-bold">${(payout * 0.9).toFixed(2)}</dd></div>
            <div className="flex justify-between"><dt>linksh.it fee (10%)</dt><dd className="font-bold">${(payout * 0.1).toFixed(2)}</dd></div>
            <div className="flex justify-between"><dt>Budget covers</dt><dd className="font-bold">{maxSales.toLocaleString()} sales</dd></div>
            <div className="flex justify-between"><dt>Deposit to start</dt><dd className="font-bold">${budget.toLocaleString()}</dd></div>
          </dl>
          <Link href="/admin/advertisers/dashboard" className="block rounded-full bg-stone-900 py-3 text-center font-bold text-white">Add deposit &amp; launch</Link>
          <p className="text-center text-xs text-stone-500">Preview: nothing is charged or saved.</p>
        </section>
      </aside>
    </div>
  );
}
