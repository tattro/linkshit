"use client";

import { useRef } from "react";

/** The ⓘ next to the joke "Verified by" badge: opens a small pop-up that closes with ✕, Esc or a tap outside. */
export function VerifiedInfo() {
  const ref = useRef<HTMLDialogElement>(null);
  return (
    <>
      <button
        type="button"
        onClick={() => ref.current?.showModal()}
        aria-label="About this badge"
        className="-ml-0.5 flex h-6 w-6 items-center justify-center rounded-full opacity-60 hover:opacity-100"
      >
        <svg viewBox="0 0 24 24" className="h-[1.05em] w-[1.05em]" aria-hidden>
          <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2" />
          <circle cx="12" cy="7.6" r="1.4" fill="currentColor" />
          <path d="M12 11v6.2" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
      </button>
      <dialog
        ref={ref}
        onClick={(e) => { if (e.target === e.currentTarget) e.currentTarget.close(); }}
        className="m-auto w-[min(20rem,calc(100vw-2rem))] rounded-2xl bg-white p-0 text-stone-900 shadow-2xl backdrop:bg-black/50"
      >
        <div className="relative px-12 py-6 text-center">
          <button
            type="button"
            onClick={() => ref.current?.close()}
            aria-label="Close"
            className="absolute right-2 top-2 flex h-9 w-9 items-center justify-center rounded-full text-lg hover:bg-stone-100"
          >
            ✕
          </button>
          <p className="text-3xl" aria-hidden>🤞</p>
          <p className="mt-2 text-base font-bold">JK, not really. No one would ever endorse me.</p>
        </div>
      </dialog>
    </>
  );
}
