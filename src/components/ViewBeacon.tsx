"use client";

import { useEffect } from "react";

/** Tells the server about a real page view (bots without JS never send this). */
export function ViewBeacon({ userId }: { userId: number }) {
  useEffect(() => {
    const body = JSON.stringify({ u: userId, r: document.referrer });
    if (!navigator.sendBeacon?.("/api/view", new Blob([body], { type: "text/plain" }))) {
      fetch("/api/view", { method: "POST", body, keepalive: true }).catch(() => {});
    }
  }, [userId]);
  return null;
}
