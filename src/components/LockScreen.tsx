"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { unlock } from "@/app/actions/locks";

/** "Type the code" screen for a locked page or link. */
export function LockScreen({ kind, id, title, next }: { kind: "page" | "link"; id: number; title: string; next?: string }) {
  const router = useRouter();
  const [state, action, pending] = useActionState(unlock, undefined);
  useEffect(() => {
    if (!state?.ok) return;
    if (next) window.location.replace(next);
    else router.refresh();
  }, [state, next, router]);
  return (
    <div className="flex min-h-screen items-center justify-center bg-stone-100 px-5 text-stone-900">
      <form action={action} className="w-full max-w-sm rounded-2xl border-2 border-stone-900 bg-white p-6 text-center shadow-[4px_4px_0_0_#1c1917]">
        <p className="text-4xl" aria-hidden>🔒</p>
        <h1 className="mt-3 text-xl font-bold">{title}</h1>
        <p className="mt-1 text-sm text-stone-500">This {kind} needs a code. Got one?</p>
        <input type="hidden" name="kind" value={kind} />
        <input type="hidden" name="id" value={id} />
        <input
          name="code"
          required
          autoFocus
          autoComplete="off"
          maxLength={40}
          placeholder="Code"
          aria-label="Code"
          className="mt-4 w-full rounded-lg border-2 border-stone-300 px-3 py-2 text-center text-lg outline-none focus:border-stone-900"
        />
        <button disabled={pending} className="mt-3 w-full rounded-lg bg-stone-900 px-4 py-2 font-semibold text-white hover:bg-lime-500 hover:text-stone-900 disabled:opacity-50">
          {pending ? "Checking…" : "Unlock"}
        </button>
        {state?.error && <p className="mt-2 text-sm text-red-600">{state.error}</p>}
      </form>
    </div>
  );
}
