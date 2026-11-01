"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

const DESKTOP = "(min-width: 1024px)";
const subscribe = (cb: () => void) => {
  const m = matchMedia(DESKTOP);
  m.addEventListener("change", cb);
  return () => m.removeEventListener("change", cb);
};

/**
 * Desktop: the phone preview sits in the right column.
 * Phones: it's tucked behind a floating "Preview" button and opens full screen.
 */
export function PreviewDock({ children }: { children: React.ReactNode }) {
  const desktop = useSyncExternalStore(subscribe, () => matchMedia(DESKTOP).matches, () => true);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (desktop || !open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = prev; removeEventListener("keydown", onKey); };
  }, [desktop, open]);

  if (desktop) {
    return (
      <aside className="sticky top-8 self-start">
        <p className="mb-2 text-center text-sm font-semibold text-stone-500">Live preview</p>
        {children}
      </aside>
    );
  }

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-full bg-stone-900 px-5 py-3 font-bold text-white shadow-2xl ring-4 ring-lime-300"
        >
          👀 Preview
        </button>
      )}
      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Live preview"
          className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-stone-900/80 p-4 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
        >
          <div className="w-full max-w-[340px] [&>[data-chaos-bounds]]:h-[min(640px,calc(100dvh-7rem))]">{children}</div>
          <button type="button" onClick={() => setOpen(false)} className="rounded-full bg-white px-6 py-2.5 font-bold text-stone-900 shadow-lg">
            Back to editing
          </button>
        </div>
      )}
    </>
  );
}
