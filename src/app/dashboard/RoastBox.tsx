"use client";

import { useState } from "react";
import type { Roast } from "@/lib/roast";

/** Up to 5 roasts: most useful first, shuffled among equally useful ones so a second roast differs. */
function pick(all: Roast[]): Roast[] {
  const shuffled = all.map((r) => ({ r, k: r.rank + Math.random() * 0.9 })).sort((a, b) => a.k - b.k).map((x) => x.r);
  return shuffled.slice(0, 5);
}

export function RoastBox({ roasts, nothing }: { roasts: Roast[]; nothing: string }) {
  const [shown, setShown] = useState<Roast[] | null>(null);
  return (
    <div className="rounded-2xl border-2 border-stone-900 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-black">🔥 Roast my linksh.it</h3>
          <p className="text-sm text-stone-500">We look at your page and tell you what&apos;s wrong with it. Nicely-ish.</p>
        </div>
        <button type="button" onClick={() => setShown(pick(roasts))} className="rounded-xl bg-stone-900 px-4 py-2 font-bold text-white hover:bg-lime-500 hover:text-stone-900">
          {shown ? "Roast me again" : "Roast me"}
        </button>
      </div>
      {shown && (
        <div aria-live="polite" className="mt-4">
          {shown.length === 0 ? (
            <p className="font-semibold">{nothing}</p>
          ) : (
            <ul className="space-y-3">
              {shown.map((r) => (
                <li key={r.id} className="rounded-xl bg-stone-100 p-3">
                  <p className="font-bold">&ldquo;{r.roast}&rdquo;</p>
                  <p className="mt-1 text-sm text-stone-600">{r.fix}</p>
                  <a href={r.href} className="mt-2 inline-block text-sm font-semibold underline decoration-lime-400 decoration-2 underline-offset-2">Fix it →</a>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
