"use client";

import Link from "next/link";
import { useActionState } from "react";
import { login } from "@/app/actions/auth";
import { buttonCls, inputCls } from "@/components/AuthShell";

export function LoginForm() {
  const [state, action, pending] = useActionState(login, undefined);
  return (
    <form action={action} className="space-y-3">
      <input name="email" type="email" required placeholder="Email" defaultValue={state?.fields?.email} className={inputCls} autoFocus />
      <input name="password" type="password" required placeholder="Password" className={inputCls} />
      <p className="text-right text-sm">
        <Link href="/forgot" className="text-stone-500 underline hover:text-stone-900">Forgot your password? Sh.it happens.</Link>
      </p>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      <button disabled={pending} className={buttonCls}>{pending ? "Logging in…" : "Log in"}</button>
    </form>
  );
}
