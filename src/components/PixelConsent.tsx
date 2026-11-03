"use client";

import { useEffect, useState } from "react";

const COOKIE = "ls_pixels";

/**
 * Creator-added Meta / Google / TikTok tracking only loads after the visitor says yes
 * (GDPR and ePrivacy in the EU/UK, and California's privacy and wiretap laws).
 * A browser sending Global Privacy Control counts as "no" without asking.
 */
export function PixelConsent({ name, services, children }: { name: string; services: string[]; children: React.ReactNode }) {
  const [choice, setChoice] = useState<"yes" | "no" | "ask" | null>(null);

  useEffect(() => {
    const saved = document.cookie.match(new RegExp(`(?:^|; )${COOKIE}=(yes|no)`))?.[1] as "yes" | "no" | undefined;
    const gpc = (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl === true;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reads browser-only state after hydration
    setChoice(gpc ? "no" : saved ?? "ask");
  }, []);

  function decide(c: "yes" | "no") {
    document.cookie = `${COOKIE}=${c}; path=/; max-age=${60 * 60 * 24 * 180}; samesite=lax`;
    setChoice(c);
  }

  if (choice === "yes") return <>{children}</>;
  if (choice !== "ask") return null;
  return (
    <aside aria-label="Tracking choice" className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-md rounded-2xl bg-stone-900 p-4 text-sm text-white shadow-lg">
      <p>
        {name} uses {services.join(", ")} tracking to see how this page does. OK to turn it on?{" "}
        <a href="https://linksh.it/privacy#cookies" className="underline">Privacy</a>
      </p>
      <div className="mt-3 flex gap-2">
        <button onClick={() => decide("yes")} className="flex-1 rounded-lg bg-white px-3 py-2 font-semibold text-stone-900">Allow</button>
        <button onClick={() => decide("no")} className="flex-1 rounded-lg border border-white/60 px-3 py-2 font-semibold">No thanks</button>
      </div>
    </aside>
  );
}
