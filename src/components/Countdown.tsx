"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

const noop = () => () => {};

function left(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return d > 0 ? `${d}d ${h}h ${pad(m)}m` : h > 0 ? `${h}h ${pad(m)}m ${pad(sec)}s` : `${m}m ${pad(sec)}s`;
}

/** A link that isn't live yet: shows "drops in …" and reloads the page the moment it goes live. */
export function Countdown({ title, icon, dropsAt, className, style }: {
  title: string;
  icon: string;
  dropsAt: string;
  className: string;
  style?: React.CSSProperties;
}) {
  const at = Date.parse(dropsAt);
  const [now, setNow] = useState(() => Date.now());
  // The server doesn't know the visitor's clock, so only show the timer in the browser
  const isClient = useSyncExternalStore(noop, () => true, () => false);
  useEffect(() => {
    const t = setInterval(() => {
      const n = Date.now();
      setNow(n);
      if (n >= at) { clearInterval(t); setTimeout(() => location.reload(), 1500); }
    }, 1000);
    return () => clearInterval(t);
  }, [at]);
  const done = now >= at;
  return (
    <div className={className} style={style} aria-live="polite">
      <span className="block">{icon ? `${icon} ` : "⏳ "}{title}</span>
      <span className="mt-0.5 block font-mono text-xs opacity-80">
        {!isClient ? "Dropping soon" : done ? "It's live! Loading…" : `Drops in ${left(at - now)}`}
      </span>
    </div>
  );
}
