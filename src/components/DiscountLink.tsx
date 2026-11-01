"use client";

import { useRef, useState } from "react";

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Older browsers and some in-app browsers block the clipboard API
    const box = document.createElement("textarea");
    box.value = text;
    box.setAttribute("readonly", "");
    box.style.position = "fixed";
    box.style.opacity = "0";
    document.body.appendChild(box);
    box.select();
    const ok = document.execCommand("copy");
    box.remove();
    return ok;
  }
}

/**
 * A link with a discount code. Tapping the link copies the code, flashes a
 * "copied" note, then opens the link. The code also sits under the button
 * with its own copy button.
 */
export function DiscountLink({ code, href, newTab, mutedClass, mutedStyle, children }: {
  code: string;
  href: string;
  newTab: boolean;
  mutedClass: string;
  mutedStyle?: React.CSSProperties;
  children: React.ReactNode;
}) {
  const [toast, setToast] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  function flash(text: string) {
    setToast(text);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(null), 2000);
  }

  function onClickCapture(e: React.MouseEvent) {
    const a = (e.target as HTMLElement).closest("a");
    // Let ctrl/cmd-click and middle-click behave normally
    if (!a || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    if (newTab) {
      // Pop-up blockers only allow a new tab straight from the tap
      void copyText(code).then((ok) => flash(ok ? `Code ${code} copied ✓` : `Your code: ${code}`));
      window.open(href, "_blank", "noopener,noreferrer");
      return;
    }
    void copyText(code).then((ok) => {
      flash(ok ? `Code ${code} copied ✓ Opening…` : `Your code: ${code}. Opening…`);
      setTimeout(() => window.location.assign(href), ok ? 700 : 1800);
    });
  }

  async function copyOnly() {
    const ok = await copyText(code);
    setCopied(ok);
    flash(ok ? `Code ${code} copied ✓` : `Your code: ${code}`);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <>
      <div onClickCapture={onClickCapture}>{children}</div>
      <div className={`mt-1.5 flex items-center justify-center gap-2 text-xs ${mutedClass}`} style={mutedStyle}>
        <span>
          🏷️ Code: <span className="select-all font-mono font-bold tracking-wide">{code}</span>
        </span>
        <button
          type="button"
          onClick={copyOnly}
          className="rounded-full border border-current px-2.5 py-0.5 font-semibold"
          aria-label={`Copy discount code ${code}`}
        >
          {copied ? "Copied ✓" : "Copy"}
        </button>
      </div>
      {toast && (
        <div
          role="status"
          className="fixed bottom-6 left-1/2 z-50 max-w-[calc(100vw-2rem)] -translate-x-1/2 rounded-full bg-stone-900 px-4 py-2 text-center text-sm font-semibold text-white shadow-lg"
        >
          {toast}
        </div>
      )}
    </>
  );
}
