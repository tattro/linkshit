"use client";

import { useState, useSyncExternalStore } from "react";

// Once a visitor confirms they're 18+, stop asking for the rest of their visit.
const KEY = "linksh:18plus";
const listeners = new Set<() => void>();
export const subscribeAdult = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };
export const adultConfirmed = () => { try { return sessionStorage.getItem(KEY) === "1"; } catch { return false; } };
export function confirmAdult() {
  try { sessionStorage.setItem(KEY, "1"); } catch {}
  listeners.forEach((l) => l());
}

/** Hides a link or embed behind an 18+ confirmation. */
export function SensitiveGate({ title, className, style, children }: {
  title: string;
  className: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}) {
  const [state, setState] = useState<"closed" | "asking">("closed");
  const adult = useSyncExternalStore(subscribeAdult, adultConfirmed, () => false);
  if (adult) return <>{children}</>;
  if (state === "asking") {
    return (
      <div className={`${className} space-y-3`} style={style} role="alertdialog" aria-label="Sensitive content warning">
        <p className="text-sm font-semibold">⚠️ Heads up: this might be sensitive or 18+ content.</p>
        <div className="flex justify-center gap-2">
          <button type="button" onClick={confirmAdult} className="rounded-lg bg-black/80 px-4 py-2 text-sm font-bold text-white">
            I&apos;m 18+, show me
          </button>
          <button type="button" onClick={() => setState("closed")} className="rounded-lg border border-current px-4 py-2 text-sm font-semibold">
            Nope
          </button>
        </div>
      </div>
    );
  }
  return (
    <button type="button" onClick={() => setState("asking")} className={`${className} w-full`} style={style}>
      <span aria-hidden className="mr-1">🔞</span>
      {title}
    </button>
  );
}
