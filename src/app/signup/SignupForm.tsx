"use client";

import { useActionState } from "react";
import { signup } from "@/app/actions/auth";
import { HandleInput } from "@/components/HandleInput";
import { buttonCls, inputCls } from "@/components/AuthShell";

export function SignupForm({ handle }: { handle: string }) {
  const [state, action, pending] = useActionState(signup, undefined);
  return (
    <form action={action} className="space-y-3">
      <HandleInput key={state?.fields?.handle ?? handle} defaultValue={state?.fields?.handle ?? handle} autoFocus={!handle} />
      <input name="email" type="email" required placeholder="Email" defaultValue={state?.fields?.email} className={inputCls} autoFocus={!!handle} />
      <input name="password" type="password" required minLength={8} placeholder="Password (8+ characters)" className={inputCls} />
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      <button disabled={pending} className={buttonCls}>{pending ? "Claiming…" : "Create my page"}</button>
    </form>
  );
}
