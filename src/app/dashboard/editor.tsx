"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { addLink, deleteLink, moveLink, updateLink, updateProfile } from "@/app/actions/links";
import type { Link } from "@/db/schema";
import { THEMES } from "@/lib/themes";

const input = "w-full rounded-lg border-2 border-stone-300 px-3 py-2 outline-none focus:border-stone-900";
const btn = "rounded-lg bg-stone-900 px-4 py-2 font-semibold text-white hover:bg-lime-500 hover:text-stone-900 disabled:opacity-50";
const ghost = "rounded-lg border-2 border-stone-300 px-2 py-1 text-sm hover:border-stone-900 disabled:opacity-30";

export function AddLinkForm() {
  const [state, action, pending] = useActionState(addLink, undefined);
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => { if (state?.ok) formRef.current?.reset(); }, [state]);
  return (
    <form ref={formRef} action={action} className="grid gap-3 sm:grid-cols-[1fr_1.5fr_auto]">
      <input name="title" required maxLength={100} placeholder="Title (e.g. My Instagram)" className={input} />
      <input name="url" required placeholder="instagram.com/you" className={input} />
      <button disabled={pending} className={btn}>{pending ? "Adding…" : "Add"}</button>
      {state?.error && <p className="text-sm text-red-600 sm:col-span-3">{state.error}</p>}
    </form>
  );
}

export function LinkItem({ link, first, last }: { link: Link; first: boolean; last: boolean }) {
  const [editing, setEditing] = useState(false);
  const [state, action, pending] = useActionState(async (prev: Awaited<ReturnType<typeof updateLink>>, fd: FormData) => {
    const result = await updateLink(prev, fd);
    if (result?.ok) setEditing(false);
    return result;
  }, undefined);

  return (
    <li className="rounded-xl border-2 border-stone-200 p-3">
      {editing ? (
        <form action={action} className="space-y-2">
          <input type="hidden" name="id" value={link.id} />
          <input name="title" defaultValue={link.title} required maxLength={100} className={input} />
          <input name="url" defaultValue={link.url} required className={input} />
          {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
          <div className="flex gap-2">
            <button disabled={pending} className={btn}>Save</button>
            <button type="button" onClick={() => setEditing(false)} className={ghost}>Cancel</button>
          </div>
        </form>
      ) : (
        <div className="flex items-center gap-3">
          <div className="flex flex-col gap-1">
            <form action={moveLink}>
              <input type="hidden" name="id" value={link.id} />
              <input type="hidden" name="dir" value="up" />
              <button disabled={first} className={ghost} aria-label="Move up">↑</button>
            </form>
            <form action={moveLink}>
              <input type="hidden" name="id" value={link.id} />
              <input type="hidden" name="dir" value="down" />
              <button disabled={last} className={ghost} aria-label="Move down">↓</button>
            </form>
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold">{link.title}</p>
            <p className="truncate text-sm text-stone-500">{link.url}</p>
          </div>
          <span className="shrink-0 rounded-full bg-stone-100 px-2 py-1 text-xs text-stone-600">
            {link.clicks} click{link.clicks === 1 ? "" : "s"}
          </span>
          <button onClick={() => setEditing(true)} className={ghost}>Edit</button>
          <form action={deleteLink} onSubmit={(e) => { if (!confirm(`Flush "${link.title}"?`)) e.preventDefault(); }}>
            <input type="hidden" name="id" value={link.id} />
            <button className={`${ghost} hover:border-red-600 hover:text-red-600`}>Delete</button>
          </form>
        </div>
      )}
    </li>
  );
}

export function ProfileForm({ user }: { user: { displayName: string; bio: string; theme: string } }) {
  const [state, action, pending] = useActionState(updateProfile, undefined);
  return (
    <form action={action} className="space-y-4">
      <label className="block">
        <span className="text-sm font-semibold">Display name</span>
        <input name="displayName" defaultValue={user.displayName} maxLength={60} className={input} />
      </label>
      <label className="block">
        <span className="text-sm font-semibold">Bio</span>
        <textarea name="bio" defaultValue={user.bio} maxLength={160} rows={2} className={input} placeholder="Say something. Or don't." />
      </label>
      <fieldset>
        <legend className="mb-2 text-sm font-semibold">Theme</legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {THEMES.map((t) => (
            <label key={t.id} className="cursor-pointer">
              <input type="radio" name="theme" value={t.id} defaultChecked={user.theme === t.id} className="peer sr-only" />
              <div className={`flex h-16 items-end rounded-lg p-2 text-xs font-bold ring-stone-900 ring-offset-2 peer-checked:ring-4 ${t.page}`}>
                {t.name}
              </div>
            </label>
          ))}
        </div>
      </fieldset>
      <div className="flex items-center gap-3">
        <button disabled={pending} className={btn}>{pending ? "Saving…" : "Save profile"}</button>
        {state?.ok && !pending && <span className="text-sm text-lime-700">Saved.</span>}
      </div>
    </form>
  );
}
