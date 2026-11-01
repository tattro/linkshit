"use client";

import { useActionState } from "react";
import { requestPasswordReset } from "@/app/actions/auth";
import { buttonCls, inputCls } from "@/components/AuthShell";

export function ForgotForm() {
  const [state, action, pending] = useActionState(requestPasswordReset, undefined);
  if (state?.ok) return <p className="rounded-xl bg-lime-100 p-4 text-sm">{state.ok}</p>;
  return (
    <form action={action} className="space-y-3">
      <p className="text-sm text-stone-600">You forgot your password again, didn&apos;t you? Drop your email and we&apos;ll send a link to fix it.</p>
      <input name="email" type="email" required placeholder="Email" defaultValue={state?.fields?.email} className={inputCls} autoFocus />
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      <button disabled={pending} className={buttonCls}>{pending ? "Sending…" : "Bail me out"}</button>
    </form>
  );
}
