"use client";

import { useActionState, useState } from "react";
import { createPage, switchPage } from "@/app/actions/pages";
import { btn } from "./editor";

type P = { id: number; handle: string; displayName: string };

const MAX_PAGES = 5;

/** Dropdown to hop between an account's pages, or start a new one. */
export function PageSwitcher({ pages, activeId, to }: { pages: P[]; activeId: number; to: "editor" | "analytics" }) {
  const [adding, setAdding] = useState(false);
  const [state, action, pending] = useActionState(createPage, undefined);
  // Keyed so the menu closes again after switching or adding a page
  return (
    <details key={`${activeId}-${pages.length}`} className="group relative">
      <summary className="flex cursor-pointer list-none items-center gap-1 whitespace-nowrap rounded-full border-2 border-stone-300 px-3 py-1 font-semibold hover:border-stone-900">
        📄 {pages.length > 1 ? `${pages.length} pages` : "Pages"} <span className="text-xs group-open:rotate-180">▾</span>
      </summary>
      <div className="absolute left-0 z-50 mt-2 w-72 sm:left-auto sm:right-0 rounded-2xl border-2 border-stone-900 bg-white p-2 shadow-xl">
        <ul>
          {pages.map((p) => (
            <li key={p.id}>
              <form action={switchPage}>
                <input type="hidden" name="id" value={p.id} />
                <input type="hidden" name="to" value={to} />
                <button className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left hover:bg-stone-100 ${p.id === activeId ? "bg-lime-100" : ""}`}>
                  <span className="min-w-0">
                    <span className="block truncate font-semibold">{p.displayName || p.handle}</span>
                    <span className="block truncate font-mono text-xs text-stone-500">linksh.it/{p.handle}</span>
                  </span>
                  {p.id === activeId && <span aria-label="Editing now">✓</span>}
                </button>
              </form>
            </li>
          ))}
        </ul>
        <div className="mt-1 border-t border-stone-200 pt-2">
          {pages.length >= MAX_PAGES ? (
            <p className="px-3 py-1 text-xs text-stone-500">{MAX_PAGES} pages max. That&apos;s plenty of sh.it.</p>
          ) : !adding ? (
            <button type="button" onClick={() => setAdding(true)} className="w-full rounded-lg px-3 py-2 text-left font-semibold text-lime-700 hover:bg-lime-50">
              + New page
            </button>
          ) : (
            <form action={action} className="space-y-2 px-1 pb-1">
              <label className="block text-xs text-stone-500" htmlFor="new-page-handle">Same login, separate page, its own link.</label>
              <div className="flex items-center rounded-lg border-2 border-stone-300 bg-white focus-within:border-stone-900">
                <span className="pl-2 font-mono text-xs text-stone-500">linksh.it/</span>
                <input id="new-page-handle" name="handle" required maxLength={30} autoFocus autoComplete="off" className="min-w-0 flex-1 bg-transparent py-2 pr-2 font-mono text-sm outline-none" />
              </div>
              {state?.error && <p className="text-xs text-red-600">{state.error}</p>}
              <button disabled={pending} className={`${btn} w-full text-sm`}>{pending ? "Creating…" : "Create page"}</button>
            </form>
          )}
        </div>
      </div>
    </details>
  );
}
