"use client";

import { useActionState, useState } from "react";
import { sendMessage } from "@/app/actions/contact";

const field = "w-full min-w-0 rounded-lg border border-current/30 bg-white px-3 py-2 text-stone-900 outline-none focus:ring-2 focus:ring-current";

/** "✉️ Message me" on a public page. Opens a small form; the owner's email stays private. */
export function ContactBox({ userId, buttonClass, buttonStyle, preview }: {
  userId: number;
  buttonClass: string;
  buttonStyle?: React.CSSProperties;
  preview?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(sendMessage, undefined);
  if (state?.ok) {
    return <p className="rounded-xl bg-current/10 px-5 py-4 text-center font-semibold">Sent. They&apos;ll get back to you by email. ✉️</p>;
  }
  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className={buttonClass} style={buttonStyle}>
        ✉️ Message me
      </button>
    );
  }
  return (
    <form action={action} className="space-y-2 rounded-xl bg-current/10 p-4">
      <p className="text-center font-semibold">Send me a message</p>
      <input type="hidden" name="userId" value={userId} />
      <input type="text" name="company" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
      <input name="name" maxLength={60} placeholder="Your name (optional)" aria-label="Your name" autoComplete="name" className={field} disabled={preview} />
      <input type="email" name="email" required maxLength={254} placeholder="Your email, so I can reply" aria-label="Your email" autoComplete="email" className={field} disabled={preview} />
      <textarea name="body" required maxLength={1000} rows={4} placeholder="What's up?" aria-label="Message" className={field} disabled={preview} />
      <button disabled={pending || preview} className={`w-full rounded-lg px-4 py-2 font-semibold ${buttonClass}`} style={buttonStyle}>
        {pending ? "Sending…" : "Send"}
      </button>
      {state?.error && <p className="text-center text-sm">{state.error}</p>}
    </form>
  );
}
