"use client";

import { useState } from "react";

import { DARK_COOKIE } from "@/lib/darkMode";

// Dark mode for the dashboard: flips the whole page's lightness (keeping hues), then flips
// photos, embeds, colour swatches and the live preview back so they still show true colours.
const CSS = `
html:has([data-dash-theme="dark"]) { filter: invert(1) hue-rotate(180deg); background: #fff; }
html:has([data-dash-theme="dark"]) :is(img, video, iframe, canvas, input[type="color"], [data-keep-colors]):not([data-keep-colors] *) {
  filter: invert(1) hue-rotate(180deg);
}
`;

/** 🌙 toggle plus an ⓘ that explains what dark mode is, for the people who need it explained. */
export function DarkModeToggle({ initial }: { initial: boolean }) {
  const [dark, setDark] = useState(initial);
  const [info, setInfo] = useState(false);

  function flip() {
    const next = !dark;
    setDark(next);
    document.cookie = `${DARK_COOKIE}=${next ? "dark" : "light"}; path=/; max-age=31536000; samesite=lax`;
  }

  return (
    <div className="relative flex items-center gap-1">
      <style>{CSS}</style>
      <span hidden data-dash-theme={dark ? "dark" : "light"} />
      <button
        type="button"
        onClick={flip}
        role="switch"
        aria-checked={dark}
        className="whitespace-nowrap rounded-full border-2 border-stone-300 px-2.5 py-1 font-semibold hover:border-stone-900"
      >
        {dark ? "☀️ Light" : "🌙 Dark"}
      </button>
      <button
        type="button"
        onClick={() => setInfo((o) => !o)}
        aria-expanded={info}
        aria-label="What's dark mode?"
        className="grid h-6 w-6 place-items-center rounded-full border-2 border-stone-300 font-serif text-xs font-bold italic text-stone-500 hover:border-stone-900 hover:text-stone-900"
      >
        i
      </button>
      {info && (
        <>
          <button type="button" aria-label="Close" onClick={() => setInfo(false)} className="fixed inset-0 z-40 cursor-default" />
          <div role="dialog" className="absolute left-0 top-full z-50 mt-2 w-64 max-w-[calc(100vw-2rem)] rounded-2xl sm:left-auto sm:right-0 border-2 border-stone-900 bg-white p-4 text-left text-sm shadow-[4px_4px_0_0_#1c1917]">
            <p className="font-bold">Doesn&apos;t that white background burn the sh.it out of your eyes? 🔥👀</p>
            <p className="mt-2 text-stone-600">That&apos;s what dark mode is for. It flips the dashboard to dark colours so you can edit at 2am without going blind. Your public page doesn&apos;t change.</p>
            <p className="mt-2 font-semibold">Dark mode&apos;s cool. 😎</p>
            <button type="button" onClick={() => { if (!dark) flip(); setInfo(false); }} className="mt-3 w-full rounded-lg bg-stone-900 px-3 py-1.5 font-semibold text-white hover:bg-lime-500 hover:text-stone-900">
              {dark ? "Got it" : "Turn it on"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
