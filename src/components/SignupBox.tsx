"use client";

import { useActionState } from "react";
import { subscribe } from "@/app/actions/subscribe";

/** Email signup box on a public page. Disabled in the dashboard preview. */
export function SignupBox({ userId, prompt, buttonClass, buttonStyle, preview }: {
  userId: number;
  prompt: string;
  buttonClass: string;
  buttonStyle?: React.CSSProperties;
  preview?: boolean;
}) {
  const [state, action, pending] = useActionState(subscribe, undefined);
  if (state?.ok) {
    return <p className="rounded-xl bg-current/10 px-5 py-4 text-center font-semibold">You&apos;re on the list. 🎉</p>;
  }
  return (
    <form action={action} className="rounded-xl bg-current/10 p-4">
      <p className="mb-3 text-center font-semibold">{prompt || "Join my email list"}</p>
      <input type="hidden" name="userId" value={userId} />
      <input type="text" name="company" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
      <div className="flex gap-2">
        <input
          type="email"
          name="email"
          required
          placeholder="you@example.com"
          aria-label="Your email"
          className="min-w-0 flex-1 rounded-lg border border-current/30 bg-white px-3 py-2 text-stone-900 outline-none focus:ring-2 focus:ring-current"
          disabled={preview}
        />
        <button disabled={pending || preview} className={`shrink-0 rounded-lg px-4 py-2 font-semibold ${buttonClass}`} style={buttonStyle}>
          {pending ? "…" : "Sign up"}
        </button>
      </div>
      {state?.error && <p className="mt-2 text-center text-sm">{state.error}</p>}
    </form>
  );
}
