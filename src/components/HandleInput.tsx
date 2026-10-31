"use client";

import { useEffect, useState } from "react";

type Status = { available: boolean; reason: string | null } | null;

export function HandleInput({ defaultValue = "", name = "handle", autoFocus = false }: {
  defaultValue?: string;
  name?: string;
  autoFocus?: boolean;
}) {
  const [value, setValue] = useState(defaultValue);
  const [status, setStatus] = useState<Status>(null);

  useEffect(() => {
    const h = value.trim();
    if (!h) return;
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/handle?h=${encodeURIComponent(h)}`, { signal: ctrl.signal });
        setStatus(await res.json());
      } catch {}
    }, 300);
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [value]);

  const shown = value.trim() ? status : null;

  return (
    <div>
      <div className="flex items-center rounded-xl border-2 border-stone-900 bg-white focus-within:ring-4 focus-within:ring-lime-300">
        <span className="pl-4 font-mono text-stone-500">linksh.it/</span>
        <input
          name={name}
          value={value}
          onChange={(e) => { setValue(e.target.value.toLowerCase().replace(/\s/g, "")); }}
          autoFocus={autoFocus}
          autoComplete="off"
          spellCheck={false}
          placeholder="yourname"
          maxLength={30}
          className="w-full bg-transparent py-3 pr-4 font-mono outline-none"
        />
      </div>
      <p className={`mt-1 h-5 text-sm ${shown?.available ? "text-lime-700" : "text-red-600"}`}>
        {shown ? (shown.available ? "✓ It's yours if you want it." : shown.reason) : ""}
      </p>
    </div>
  );
}
