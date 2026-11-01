"use client";

import { useActionState, useState } from "react";
import { askQuestion } from "@/app/actions/qa";

/** "Talk to me": anonymous questions. Nothing shows publicly until the owner answers it. */
export function AskBox({ userId, prompt, buttonClass, buttonStyle, preview }: {
  userId: number;
  prompt: string;
  buttonClass: string;
  buttonStyle?: React.CSSProperties;
  preview?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(askQuestion, undefined);
  const [sent, setSent] = useState(0);
  const [handled, setHandled] = useState(state);
  if (state !== handled) {
    setHandled(state);
    if (state?.ok) { setSent((n) => n + 1); setOpen(false); }
  }
  const title = prompt || "💬 Talk to me";
  if (!open) {
    return (
      <div className="space-y-2">
        <button type="button" onClick={() => setOpen(true)} className={`w-full ${buttonClass}`} style={buttonStyle}>
          {title}
        </button>
        {sent > 0 && <p className="text-center text-sm font-semibold">Sent anonymously. If they answer, it shows up below. 🕵️</p>}
      </div>
    );
  }
  return (
    <form action={action} className="space-y-2 rounded-xl tint p-4">
      <p className="text-center font-semibold">{title}</p>
      <p className="text-center text-xs opacity-70">Totally anonymous. It only shows up here if I answer it.</p>
      <input type="hidden" name="userId" value={userId} />
      <input type="text" name="company" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
      <textarea
        name="body"
        required
        maxLength={300}
        rows={3}
        placeholder="Ask me anything…"
        aria-label="Your question"
        disabled={preview}
        className="w-full min-w-0 rounded-lg border border-current/30 bg-white px-3 py-2 text-stone-900 outline-none focus:ring-2 focus:ring-current"
      />
      <button disabled={pending || preview} className={`w-full rounded-lg px-4 py-2 font-semibold ${buttonClass}`} style={buttonStyle}>
        {pending ? "Sending…" : "Send anonymously"}
      </button>
      {state?.error && <p className="text-center text-sm">{state.error}</p>}
    </form>
  );
}
