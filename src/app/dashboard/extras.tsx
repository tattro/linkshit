"use client";

import { useActionState } from "react";
import { setPageLock, setRedirect, setSeo, setTracking, type ExtrasState } from "@/app/actions/extras";
import { btn, input } from "./editor";

function Status({ state, pending }: { state: ExtrasState; pending: boolean }) {
  if (pending) return null;
  if (state?.error) return <p className="text-sm text-red-600">{state.error}</p>;
  if (state?.ok) return <span className="text-sm text-lime-700">Saved.</span>;
  return null;
}

const sub = "text-sm text-stone-500";
const h3 = "font-semibold";

export function RedirectForm({ links, current }: { links: { id: number; title: string }[]; current: number | null }) {
  const [state, action, pending] = useActionState(setRedirect, undefined);
  return (
    <form action={action} className="space-y-2">
      <h3 className={h3}>↪️ Redirect mode</h3>
      <p className={sub}>Skip your page and send everyone straight to one link. Handy for a drop or a launch. Clicks still count.</p>
      <div className="flex flex-wrap items-center gap-2">
        <select name="linkId" defaultValue={current ?? ""} className={`${input} w-auto min-w-0 max-w-full flex-1`}>
          <option value="">Off: show my page</option>
          {links.map((l) => <option key={l.id} value={l.id}>Send everyone to: {l.title}</option>)}
        </select>
        <button disabled={pending} className={btn}>Save</button>
      </div>
      {current && <p className="text-sm font-semibold text-amber-700">Redirect mode is on. Visitors don&apos;t see your page right now.</p>}
      <Status state={state} pending={pending} />
    </form>
  );
}

export function PageLockForm({ code }: { code: string | null }) {
  const [state, action, pending] = useActionState(setPageLock, undefined);
  return (
    <form action={action} className="space-y-2">
      <h3 className={h3}>🔒 Lock this page</h3>
      <p className={sub}>Visitors type a code before they see anything. Leave it empty to keep the page open. You can also lock single links under a link&apos;s More options.</p>
      <div className="flex gap-2">
        <input name="code" defaultValue={code ?? ""} maxLength={40} placeholder="Code (e.g. vipsonly)" autoComplete="off" className={`${input} min-w-0 flex-1`} />
        <button disabled={pending} className={`${btn} shrink-0`}>Save</button>
      </div>
      <Status state={state} pending={pending} />
    </form>
  );
}

export function SeoForm({ title, description }: { title: string; description: string }) {
  const [state, action, pending] = useActionState(setSeo, undefined);
  return (
    <form action={action} className="space-y-2">
      <h3 className={h3}>🔎 Google and link previews</h3>
      <p className={sub}>What shows up on Google and when your link is pasted into iMessage, Discord and the like. Leave empty to use your name and bio.</p>
      <input name="seoTitle" defaultValue={title} maxLength={70} placeholder="Title" className={input} />
      <textarea name="seoDescription" defaultValue={description} maxLength={200} rows={2} placeholder="Description" className={input} />
      <div className="flex items-center gap-3">
        <button disabled={pending} className={btn}>Save</button>
        <Status state={state} pending={pending} />
      </div>
    </form>
  );
}

export function TrackingForm({ metaPixel, googleAnalytics, tiktokPixel, utm }: { metaPixel: string; googleAnalytics: string; tiktokPixel: string; utm: boolean }) {
  const [state, action, pending] = useActionState(setTracking, undefined);
  return (
    <form action={action} className="space-y-2">
      <h3 className={h3}>📊 Tracking pixels</h3>
      <p className={sub}>Run ads? Paste your IDs and your page reports visits to them. Leave empty if you don&apos;t know what this is.</p>
      <div className="grid gap-2 sm:grid-cols-3">
        <input name="metaPixel" defaultValue={metaPixel} placeholder="Meta Pixel ID" aria-label="Meta Pixel ID" className={input} />
        <input name="googleAnalytics" defaultValue={googleAnalytics} placeholder="Google Analytics (G-…)" aria-label="Google Analytics ID" className={input} />
        <input name="tiktokPixel" defaultValue={tiktokPixel} placeholder="TikTok Pixel ID" aria-label="TikTok Pixel ID" className={input} />
      </div>
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" name="utm" defaultChecked={utm} className="mt-0.5 h-4 w-4 shrink-0 accent-lime-500" />
        <span>Add UTM tags to my links, so the sites I link to can see the traffic came from linksh.it</span>
      </label>
      <div className="flex items-center gap-3">
        <button disabled={pending} className={btn}>Save</button>
        <Status state={state} pending={pending} />
      </div>
    </form>
  );
}
