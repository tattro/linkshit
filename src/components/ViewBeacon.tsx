"use client";

import { useEffect } from "react";

/** Tells the server about a real page view (bots without JS never send this). */
export function ViewBeacon({ userId }: { userId: number }) {
  useEffect(() => {
    const qr = new URLSearchParams(location.search).has("qr");
    const body = JSON.stringify({ u: userId, r: document.referrer, q: qr ? 1 : 0 });
    // Tidy the address bar so a shared copy of the URL doesn't count as a scan
    if (qr) history.replaceState(null, "", location.pathname);
    if (!navigator.sendBeacon?.("/api/view", new Blob([body], { type: "text/plain" }))) {
      fetch("/api/view", { method: "POST", body, keepalive: true }).catch(() => {});
    }
  }, [userId]);
  return null;
}
