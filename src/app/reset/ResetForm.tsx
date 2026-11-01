"use client";

import { useActionState } from "react";
import { resetPassword } from "@/app/actions/auth";
import { buttonCls, inputCls } from "@/components/AuthShell";

export function ResetForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(resetPassword, undefined);
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="token" value={token} />
      <input name="password" type="password" required minLength={8} placeholder="New password (8+ characters)" className={inputCls} autoFocus />
      <input name="confirm" type="password" required minLength={8} placeholder="Same again (no typos this time)" className={inputCls} />
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      <button disabled={pending} className={buttonCls}>{pending ? "Saving…" : "Save it (and maybe write it down)"}</button>
    </form>
  );
}
