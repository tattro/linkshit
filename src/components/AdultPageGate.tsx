"use client";

import { useSyncExternalStore } from "react";
import { confirmAdult, subscribeAdult, adultConfirmed } from "./SensitiveGate";

/** Covers the whole page until the visitor says they're 18+. Remembered for the visit. */
export function AdultPageGate({ name }: { name: string }) {
  const adult = useSyncExternalStore(subscribeAdult, adultConfirmed, () => false);
  if (adult) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6 backdrop-blur-2xl" role="alertdialog" aria-modal="true" aria-label="Age check">
      <div className="w-full max-w-sm rounded-3xl bg-white p-6 text-center text-stone-900 shadow-2xl">
        <p className="text-4xl" aria-hidden>🔞</p>
        <h1 className="mt-2 text-xl font-black">{name}&apos;s page is 18+</h1>
        <p className="mt-1 text-sm text-stone-600">You need to be 18 or older to see it.</p>
        <button type="button" onClick={confirmAdult} className="mt-5 w-full rounded-xl bg-stone-900 py-3 font-bold text-white">
          I&apos;m 18 or older
        </button>
        <a href="https://www.google.com" className="mt-2 block w-full rounded-xl py-3 text-sm font-semibold text-stone-500">Take me back</a>
      </div>
    </div>
  );
}
