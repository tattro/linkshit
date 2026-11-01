"use client";

import { useActionState, useRef } from "react";
import { createOffer } from "@/app/actions/marketplace";

const input = "w-full rounded-lg border-2 border-stone-300 bg-white px-3 py-2 text-sm outline-none focus:border-stone-900";

export function OfferForm() {
  const ref = useRef<HTMLFormElement>(null);
  const [state, action, pending] = useActionState(async (prev: Awaited<ReturnType<typeof createOffer>>, fd: FormData) => {
    const r = await createOffer(prev, fd);
    if (r?.ok) ref.current?.reset();
    return r;
  }, undefined);
  return (
    <form ref={ref} action={action} className="grid gap-3 sm:grid-cols-2">
      <input name="title" required maxLength={100} placeholder="Button text, e.g. Get 50% off Acme Headphones" className={input} />
      <input name="advertiser" required maxLength={80} placeholder="Advertiser, e.g. Acme" className={input} />
      <input name="url" required placeholder="Tracking URL, e.g. https://acme.com/?ref=linkshit&sub={handle}" className={`${input} sm:col-span-2`} />
      <input name="payout" maxLength={60} placeholder="Creator payout, e.g. 30% per sale" className={input} />
      <input name="category" maxLength={40} placeholder="Niche, e.g. Music, Fitness, Gaming" className={input} />
      <input name="icon" maxLength={16} placeholder="Emoji (optional)" className={input} />
      <input name="description" maxLength={300} placeholder="Short pitch for creators" className={input} />
      <label className="flex items-center gap-2 text-sm sm:col-span-2">
        <input type="checkbox" name="autoApprove" defaultChecked className="h-4 w-4 accent-lime-500" />
        Auto-approve (creators get it instantly). Untick if the advertiser wants to approve each creator.
      </label>
      <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
        <button disabled={pending} className="rounded-lg bg-stone-900 px-4 py-2 font-semibold text-white disabled:opacity-50">
          {pending ? "Adding…" : "Add offer"}
        </button>
        {state?.error && <span className="text-sm text-red-600">{state.error}</span>}
        {state?.ok && !pending && <span className="text-sm text-lime-700">Added. It&apos;s live in the Marketplace.</span>}
        <span className="text-xs text-stone-500">{"{handle}"} and {"{uid}"} in the URL become each creator&apos;s, so the advertiser can credit them.</span>
      </div>
    </form>
  );
}
