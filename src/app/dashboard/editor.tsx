"use client";

import { startTransition, useActionState, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { addLink, deleteLink, moveLink, updateLink, type ActionState } from "@/app/actions/links";
import {
  removeAvatar, removeBackground, updateLook, updateProfile, updateSignup, updateSocials, updateTips, uploadAvatar, uploadBackground,
} from "@/app/actions/profile";
import { resendVerification } from "@/app/actions/auth";
import type { Link, Socials, Style, Tips } from "@/db/schema";
import { setLookDraft } from "./lookDraft";
import { ChaosToggle } from "./ChaosMode";
import { embedFor } from "@/lib/embeds";
import { TIP_PROVIDERS } from "@/lib/tips";
import { FONTS, parseStyle, GRADIENT_DIRS, GRADIENT_PRESETS, SHAPES, gradientCss, hasCustomColors } from "@/lib/style";
import { THEMES } from "@/lib/themes";

export const input = "w-full rounded-lg border-2 border-stone-300 bg-white px-3 py-2 outline-none focus:border-stone-900";
export const btn = "rounded-lg bg-stone-900 px-4 py-2 font-semibold text-white hover:bg-lime-500 hover:text-stone-900 disabled:opacity-50";
export const ghost = "rounded-lg border-2 border-stone-300 px-2 py-1 text-sm hover:border-stone-900 disabled:opacity-30";


/** Sends the browser's timezone offset so scheduled times are saved correctly. */
function TzInput() {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { if (ref.current) ref.current.value = String(new Date().getTimezoneOffset()); }, []);
  return <input ref={ref} type="hidden" name="tz" defaultValue="0" />;
}

function toLocalInput(d: Date | string | null) {
  if (!d) return "";
  const date = new Date(d);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function LinkExtras({ link, url }: { link?: Link; url: string }) {
  const [open, setOpen] = useState(Boolean(link?.startsAt || link?.endsAt || link?.embed));
  const canEmbed = url.trim() !== "" && embedFor(/^https?:\/\//i.test(url.trim()) ? url.trim() : `https://${url.trim()}`) !== null;
  return (
    <div className="sm:col-span-3">
      <TzInput />
      {canEmbed && (
        <label className="mb-2 flex items-center gap-2 text-sm">
          <input type="checkbox" name="embed" defaultChecked={link?.embed} className="h-4 w-4 accent-lime-500" />
          Show as an embedded player instead of a button
        </label>
      )}
      <div className="mb-2 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
        <label className="flex items-center gap-2">
          <input type="checkbox" name="spotlight" defaultChecked={link?.spotlight} className="h-4 w-4 accent-lime-500" />
          ✨ Spotlight (wiggles)
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" name="sensitive" defaultChecked={link?.sensitive} className="h-4 w-4 accent-lime-500" />
          🔞 Sensitive (18+ warning)
        </label>
        <label className="flex items-center gap-2">
          Icon
          <input
            name="icon"
            defaultValue={link?.icon ?? ""}
            placeholder="🔥"
            maxLength={16}
            aria-label="Emoji icon (optional)"
            className="w-14 rounded-lg border-2 border-stone-300 bg-white px-2 py-1 text-center outline-none focus:border-stone-900"
          />
          <span className="text-xs text-stone-400">emoji, optional</span>
        </label>
      </div>
      {!open ? (
        <button type="button" onClick={() => setOpen(true)} className="text-sm text-stone-500 underline">
          Schedule this link
        </button>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="text-sm">
            <span className="text-stone-500">Show from (optional)</span>
            <input type="datetime-local" name="startsAt" defaultValue={toLocalInput(link?.startsAt ?? null)} className={input} />
          </label>
          <label className="text-sm">
            <span className="text-stone-500">Hide after (optional)</span>
            <input type="datetime-local" name="endsAt" defaultValue={toLocalInput(link?.endsAt ?? null)} className={input} />
          </label>
        </div>
      )}
    </div>
  );
}

export function AddLinkForm() {
  const [state, action, pending] = useActionState(addLink, undefined);
  const [url, setUrl] = useState("");
  const [key, setKey] = useState(0);
  const formRef = useRef<HTMLFormElement>(null);
  const [handled, setHandled] = useState<ActionState>(undefined);
  if (state !== handled) {
    setHandled(state);
    if (state?.ok) { setUrl(""); setKey((k) => k + 1); }
  }
  return (
    <form key={key} ref={formRef} action={action} className="grid gap-3 sm:grid-cols-[1fr_1.5fr_auto]">
      <input name="title" required maxLength={100} placeholder="Title (e.g. My Instagram)" className={input} />
      <input name="url" required placeholder="instagram.com/you" value={url} onChange={(e) => setUrl(e.target.value)} className={input} />
      <button disabled={pending} className={btn}>{pending ? "Adding…" : "Add"}</button>
      <LinkExtras url={url} />
      {state?.error && <p className="text-sm text-red-600 sm:col-span-3">{state.error}</p>}
    </form>
  );
}

const noopSubscribe = () => () => {};

function scheduleLabel(l: Link) {
  const now = Date.now();
  const s = l.startsAt ? new Date(l.startsAt).getTime() : null;
  const e = l.endsAt ? new Date(l.endsAt).getTime() : null;
  if (e && e <= now) return { text: "Expired", cls: "bg-stone-200 text-stone-600" };
  if (s && s > now) return { text: `Goes live ${new Date(s).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}`, cls: "bg-amber-100 text-amber-800" };
  if (e) return { text: `Hides ${new Date(e).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}`, cls: "bg-sky-100 text-sky-800" };
  return null;
}

export function LinkItem({ link, first, last }: { link: Link; first: boolean; last: boolean }) {
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [url, setUrl] = useState(link.url);
  const [state, action, pending] = useActionState(async (prev: ActionState, fd: FormData) => {
    const result = await updateLink(prev, fd);
    if (result?.ok) setEditing(false);
    return result;
  }, undefined);
  // Depends on the viewer's clock and timezone, so only compute it in the browser
  const isClient = useSyncExternalStore(noopSubscribe, () => true, () => false);
  const label = isClient ? scheduleLabel(link) : null;

  if (editing) {
    return (
      <li className="rounded-xl border-2 border-stone-900 p-3">
        <form action={action} className="grid gap-2">
          <input type="hidden" name="id" value={link.id} />
          <input name="title" defaultValue={link.title} required maxLength={100} className={input} />
          <input name="url" value={url} onChange={(e) => setUrl(e.target.value)} required className={input} />
          <LinkExtras link={link} url={url} />
          {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
          <div className="flex gap-2">
            <button disabled={pending} className={btn}>Save</button>
            <button type="button" onClick={() => setEditing(false)} className={ghost}>Cancel</button>
          </div>
        </form>
      </li>
    );
  }

  return (
    <li className="rounded-xl border-2 border-stone-200 p-3">
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
          <p className="truncate font-semibold">
            {link.icon && <span className="mr-1">{link.icon}</span>}
            {link.title}
            {link.embed && <span className="ml-2 rounded bg-violet-100 px-1.5 py-0.5 text-xs font-medium text-violet-800">embed</span>}
            {link.spotlight && <span className="ml-2 rounded bg-yellow-100 px-1.5 py-0.5 text-xs font-medium text-yellow-800">✨ spotlight</span>}
            {link.sensitive && <span className="ml-2 rounded bg-red-100 px-1.5 py-0.5 text-xs font-medium text-red-800">🔞 18+</span>}
          </p>
          <p className="truncate text-sm text-stone-500">{link.url}</p>
          {label && <span className={`mt-1 inline-block rounded px-1.5 py-0.5 text-xs ${label.cls}`}>{label.text}</span>}
        </div>
        <span className="hidden shrink-0 rounded-full bg-stone-100 px-2 py-1 text-xs text-stone-600 sm:inline">
          {link.clicks} click{link.clicks === 1 ? "" : "s"}
        </span>
        {confirming ? (
          <>
            <form action={deleteLink}>
              <input type="hidden" name="id" value={link.id} />
              <button className="rounded-lg bg-red-600 px-2 py-1 text-sm font-semibold text-white">Flush it</button>
            </form>
            <button onClick={() => setConfirming(false)} className={ghost}>Keep</button>
          </>
        ) : (
          <>
            <button onClick={() => setEditing(true)} className={ghost}>Edit</button>
            <button onClick={() => setConfirming(true)} className={`${ghost} hover:border-red-600 hover:text-red-600`}>Delete</button>
          </>
        )}
      </div>
    </li>
  );
}

function Saved({ show }: { show: boolean }) {
  return show ? <span className="text-sm text-lime-700">Saved.</span> : null;
}

export function ProfileForm({ user }: { user: { displayName: string; bio: string } }) {
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
      <div className="flex items-center gap-3">
        <button disabled={pending} className={btn}>{pending ? "Saving…" : "Save"}</button>
        <Saved show={!!state?.ok && !pending} />
        {state?.error && <span className="text-sm text-red-600">{state.error}</span>}
      </div>
    </form>
  );
}

/** Crops to a centred square and shrinks to 400px WebP in the browser before upload. */
async function shrinkImage(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const size = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = Math.min(400, size);
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(bitmap, (bitmap.width - size) / 2, (bitmap.height - size) / 2, size, size, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("encode failed"))), "image/webp", 0.85),
  );
}

export function AvatarForm({ current, initial }: { current: string | null; initial: string }) {
  const [state, action, pending] = useActionState(uploadAvatar, undefined);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError(null);
    if (!file.type.startsWith("image/")) return setError("That's not an image.");
    setBusy(true);
    try {
      const blob = await shrinkImage(file);
      const fd = new FormData();
      fd.set("avatar", new File([blob], "avatar.webp", { type: "image/webp" }));
      startTransition(() => action(fd));
    } catch {
      setError("Couldn't read that image. Try a JPG or PNG.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-4">
      {current ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={current} alt="Your profile photo" className="h-20 w-20 rounded-full object-cover" />
      ) : (
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-stone-200 text-3xl font-black uppercase text-stone-500">{initial}</div>
      )}
      <div className="space-y-2">
        <input ref={fileRef} type="file" accept="image/*" onChange={onPick} className="hidden" />
        <div className="flex gap-2">
          <button type="button" disabled={busy || pending} onClick={() => fileRef.current?.click()} className={btn}>
            {busy || pending ? "Uploading…" : current ? "Change photo" : "Upload photo"}
          </button>
          {current && (
            <form action={removeAvatar}>
              <button className={ghost}>Remove</button>
            </form>
          )}
        </div>
        {(error || state?.error) && <p className="text-sm text-red-600">{error ?? state?.error}</p>}
      </div>
    </div>
  );
}

/** Shrinks a background photo to WebP (max 1600px long side) so it fits under the upload limit. */
async function shrinkBackground(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  for (const [max, quality] of [[1600, 0.8], [1280, 0.7], [960, 0.6]] as const) {
    const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/webp", quality));
    if (blob && blob.size <= 880 * 1024) return blob;
  }
  throw new Error("too big");
}

export function BackgroundForm({ current }: { current: string | null }) {
  const [state, action, pending] = useActionState(uploadBackground, undefined);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError(null);
    if (!file.type.startsWith("image/")) return setError("That's not an image.");
    setBusy(true);
    try {
      const blob = await shrinkBackground(file);
      const fd = new FormData();
      fd.set("background", new File([blob], "background.webp", { type: "image/webp" }));
      startTransition(() => action(fd));
    } catch {
      setError("Couldn't use that image. Try a JPG or PNG.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <p className="mb-2 text-sm font-semibold">Background photo</p>
      <div className="flex items-center gap-4">
        <div
          className="h-20 w-14 shrink-0 rounded-lg border-2 border-stone-300 bg-stone-100 bg-cover bg-center"
          style={current ? { backgroundImage: `url("${current}")` } : undefined}
          aria-hidden
        />
        <div className="space-y-2">
          <input ref={fileRef} type="file" accept="image/*" onChange={onPick} className="hidden" />
          <div className="flex gap-2">
            <button type="button" disabled={busy || pending} onClick={() => fileRef.current?.click()} className={btn}>
              {busy || pending ? "Uploading…" : current ? "Change background" : "Upload background"}
            </button>
            {current && (
              <form action={removeBackground}>
                <button className={ghost}>Remove</button>
              </form>
            )}
          </div>
          <p className="text-xs text-stone-500">Covers your whole page, behind everything. Tall photos look best on phones.</p>
          {(error || state?.error) && <p className="text-sm text-red-600">{error ?? state?.error}</p>}
        </div>
      </div>
    </div>
  );
}

export function SocialsForm({ socials, platforms }: {
  socials: Socials;
  platforms: { id: string; label: string; path: string; placeholder: string }[];
}) {
  const [state, action, pending] = useActionState(updateSocials, undefined);
  const [showAll, setShowAll] = useState(false);
  const shown = showAll ? platforms : platforms.filter((p, i) => socials[p.id] || i < 6);
  return (
    <form action={action} className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-2">
        {platforms.map((p) => (
          <label key={p.id} className={`flex items-center gap-2 ${shown.includes(p) ? "" : "hidden"}`}>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden className="shrink-0 text-stone-700"><path d={p.path} /></svg>
            <span className="sr-only">{p.label}</span>
            <input
              name={p.id}
              defaultValue={socials[p.id]?.replace(/^mailto:/, "") ?? ""}
              placeholder={`${p.label}: ${p.placeholder}`}
              className={input}
            />
          </label>
        ))}
      </div>
      {!showAll && (
        <button type="button" onClick={() => setShowAll(true)} className="text-sm text-stone-500 underline">
          More platforms
        </button>
      )}
      <div className="flex items-center gap-3">
        <button disabled={pending} className={btn}>{pending ? "Saving…" : "Save socials"}</button>
        <Saved show={!!state?.ok && !pending} />
        {state?.error && <span className="text-sm text-red-600">{state.error}</span>}
      </div>
    </form>
  );
}

export function LookForm({ user, avatar, background }: { user: { theme: string; style: Style; openInApp: boolean }; avatar: string | null; background: string | null }) {
  const [state, action, pending] = useActionState(updateLook, undefined);
  const [custom, setCustom] = useState(hasCustomColors(user.style));
  const s = user.style;
  const [colors, setColors] = useState({
    bg: s.bg ?? "#f5f5f4", text: s.text ?? "#1c1917", button: s.button ?? "#ffffff", buttonText: s.buttonText ?? "#1c1917",
  });
  const [bgMode, setBgMode] = useState<"solid" | "gradient">(s.bg2 ? "gradient" : "solid");
  const [bg2, setBg2] = useState(s.bg2 ?? "#7b2ff7");
  const [bgDir, setBgDir] = useState<string>(s.bgDir ?? "down");
  const [stealing, setStealing] = useState(false);

  const formRef = useRef<HTMLFormElement>(null);
  function publishDraft() {
    const form = formRef.current;
    if (!form) return;
    const data = Object.fromEntries(new FormData(form));
    setLookDraft({ theme: String(data.theme ?? user.theme), style: parseStyle(data) });
  }
  // Controlled bits (colours, presets, stolen palettes) change without a form event.
  useEffect(publishDraft, [custom, colors, bgMode, bg2, bgDir]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => setLookDraft(null), []);

  function applyPreset(p: (typeof GRADIENT_PRESETS)[number]) {
    setCustom(true);
    setBgMode("gradient");
    setBg2(p.bg2);
    setBgDir(p.dir);
    setColors((c) => ({ ...c, bg: p.bg, text: p.text }));
  }
  const [stealError, setStealError] = useState<string | null>(null);

  async function steal(src: string) {
    setStealing(true);
    setStealError(null);
    try {
      const { paletteFromImage } = await import("@/lib/palette");
      setColors(await paletteFromImage(src));
      setCustom(true);
    } catch {
      setStealError("Couldn't read your photo. Try uploading it again.");
    } finally {
      setStealing(false);
    }
  }
  return (
    <form ref={formRef} action={action} onChange={publishDraft} className="space-y-5">
      <fieldset>
        <legend className="mb-2 text-sm font-semibold">Theme</legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {THEMES.map((t) => (
            <label key={t.id} className="cursor-pointer">
              <input type="radio" name="theme" value={t.id} defaultChecked={user.theme === t.id} className="peer sr-only" />
              <div className={`flex h-16 items-end rounded-lg p-2 text-xs font-bold ring-stone-900 ring-offset-2 peer-checked:ring-4 peer-focus-visible:ring-4 ${t.page}`}>
                {t.name}
              </div>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-2 text-sm font-semibold">Button shape</legend>
        <div className="flex flex-wrap gap-2">
          {SHAPES.map((sh) => (
            <label key={sh.id} className="cursor-pointer">
              <input type="radio" name="shape" value={sh.id} defaultChecked={(s.shape ?? "rounded") === sh.id} className="peer sr-only" />
              <span className={`inline-block border-2 border-stone-900 px-4 py-2 text-sm font-semibold peer-checked:bg-stone-900 peer-checked:text-white peer-focus-visible:ring-4 peer-focus-visible:ring-lime-300 ${
                sh.id === "pill" ? "rounded-full" : sh.id === "square" ? "rounded-none" : "rounded-lg"
              }`}>{sh.name}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-2 text-sm font-semibold">Font</legend>
        <div className="flex flex-wrap gap-2">
          {FONTS.map((f) => (
            <label key={f.id} className="cursor-pointer">
              <input type="radio" name="font" value={f.id} defaultChecked={(s.font ?? "sans") === f.id} className="peer sr-only" />
              <span style={{ fontFamily: f.css }} className="inline-block rounded-lg border-2 border-stone-300 px-4 py-2 text-lg peer-checked:border-stone-900 peer-checked:bg-lime-200 peer-focus-visible:ring-4 peer-focus-visible:ring-lime-300">
                {f.name}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <label className="flex items-center gap-2 text-sm font-semibold">
            <input type="checkbox" name="customColors" checked={custom} onChange={(e) => setCustom(e.target.checked)} className="h-4 w-4 accent-lime-500" />
            Use my own colours (overrides the theme)
          </label>
          <div className="flex flex-wrap gap-2">
            {avatar && (
              <button type="button" onClick={() => steal(avatar)} disabled={stealing} className={`${ghost} px-3 py-1.5 font-semibold`}>
                {stealing ? "Sniffing…" : "🎨 Steal colours from my photo"}
              </button>
            )}
            {background && (
              <button type="button" onClick={() => steal(background)} disabled={stealing} className={`${ghost} px-3 py-1.5 font-semibold`}>
                {stealing ? "Sniffing…" : "🎨 Steal from my background"}
              </button>
            )}
          </div>
        </div>
        {stealError && <p className="mt-2 text-sm text-red-600">{stealError}</p>}
        <div className="mt-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-500">Quick gradients</p>
          <div className="flex flex-wrap gap-2">
            {GRADIENT_PRESETS.map((p) => (
              <button
                key={p.name}
                type="button"
                onClick={() => applyPreset(p)}
                title={p.name}
                className="flex h-12 w-20 items-end rounded-lg p-1.5 text-left text-[11px] font-bold ring-stone-900 ring-offset-2 hover:ring-2 focus-visible:ring-4"
                style={{ backgroundImage: gradientCss(p.bg, p.bg2, p.dir), color: p.text }}
              >
                {p.name}
              </button>
            ))}
          </div>
        </div>
        {custom && (
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {([
              ["bg", "Background"],
              ["text", "Text"],
              ["button", "Buttons"],
              ["buttonText", "Button text"],
            ] as const).map(([name, label]) => (
              <label key={name} className="flex items-center gap-2 text-sm">
                <input
                  type="color"
                  name={name}
                  value={colors[name]}
                  onChange={(e) => setColors((c) => ({ ...c, [name]: e.target.value }))}
                  className="h-9 w-12 cursor-pointer rounded border-2 border-stone-300"
                />
                {label}
              </label>
            ))}
          </div>
        )}
        {custom && (
          <div className="mt-4 space-y-3 rounded-xl border-2 border-stone-200 p-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold">Background:</span>
              {(["solid", "gradient"] as const).map((m) => (
                <label key={m} className="cursor-pointer">
                  <input type="radio" name="bgMode" value={m} checked={bgMode === m} onChange={() => setBgMode(m)} className="peer sr-only" />
                  <span className="inline-block rounded-lg border-2 border-stone-300 px-3 py-1 text-sm font-semibold capitalize peer-checked:border-stone-900 peer-checked:bg-lime-200 peer-focus-visible:ring-4 peer-focus-visible:ring-lime-300">
                    {m}
                  </span>
                </label>
              ))}
            </div>
            {bgMode === "gradient" && (
              <div className="flex flex-wrap items-center gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <input type="color" name="bg2" value={bg2} onChange={(e) => setBg2(e.target.value)} className="h-9 w-12 cursor-pointer rounded border-2 border-stone-300" />
                  Fades into
                </label>
                <div className="flex gap-1" role="radiogroup" aria-label="Gradient direction">
                  {GRADIENT_DIRS.map((d) => (
                    <label key={d.id} className="cursor-pointer" title={d.label}>
                      <input type="radio" name="bgDir" value={d.id} checked={bgDir === d.id} onChange={() => setBgDir(d.id)} className="peer sr-only" aria-label={d.label} />
                      <span className="grid h-9 w-9 place-items-center rounded-lg border-2 border-stone-300 text-lg peer-checked:border-stone-900 peer-checked:bg-lime-200 peer-focus-visible:ring-4 peer-focus-visible:ring-lime-300">
                        {d.name}
                      </span>
                    </label>
                  ))}
                </div>
                <div
                  aria-hidden
                  className="h-9 flex-1 rounded-lg border-2 border-stone-300"
                  style={{ minWidth: 80, backgroundImage: gradientCss(colors.bg, bg2, bgDir) }}
                />
              </div>
            )}
          </div>
        )}
      </fieldset>

      {background && (
        <fieldset>
          <legend className="mb-2 text-sm font-semibold">Background tint</legend>
          <p className="-mt-1 mb-2 text-xs text-stone-500">Washes over your photo so your name and bio stay readable.</p>
          <div className="flex flex-wrap gap-2">
            {([["", "None"], ["dark", "Darken"], ["light", "Lighten"]] as const).map(([id, name]) => (
              <label key={name} className="cursor-pointer">
                <input type="radio" name="bgTint" value={id} defaultChecked={(s.bgTint ?? "") === id} className="peer sr-only" />
                <span className="inline-block rounded-lg border-2 border-stone-300 px-4 py-2 text-sm font-semibold peer-checked:border-stone-900 peer-checked:bg-lime-200 peer-focus-visible:ring-4 peer-focus-visible:ring-lime-300">
                  {name}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      )}

      <fieldset>
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" name="openInApp" defaultChecked={user.openInApp} className="mt-0.5 h-4 w-4 accent-lime-500" />
          <span>
            <span className="font-semibold">Open links in apps on phones.</span>{" "}
            <span className="text-stone-500">YouTube, Spotify, Instagram and X links open in the app instead of a browser tab, when the visitor has it.</span>
          </span>
        </label>
      </fieldset>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <div className="flex items-center gap-3">
          <button disabled={pending} className={btn}>{pending ? "Saving…" : "Save look"}</button>
          <Saved show={!!state?.ok && !pending} />
        </div>
        <ChaosToggle />
      </div>
    </form>
  );
}

export function VerifyBanner({ email }: { email: string }) {
  const [state, action, pending] = useActionState(resendVerification, undefined);
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border-2 border-amber-500 bg-amber-50 p-4 text-sm">
      <p>
        <span className="font-bold">Confirm your email.</span> We sent a link to {email}. It lets you reset your password if you ever forget it.
      </p>
      <form action={action} className="flex items-center gap-2">
        {state?.ok && <span className="text-lime-700">{state.ok}</span>}
        {state?.error && <span className="text-red-600">{state.error}</span>}
        <button disabled={pending} className={ghost}>{pending ? "Sending…" : "Resend link"}</button>
      </form>
    </div>
  );
}

export function ShareCard({ url, qrSvg }: { url: string; qrSvg: string }) {
  const [copied, setCopied] = useState(false);
  const display = url.replace(/^https?:\/\//, "");
  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row">
      <div className="h-36 w-36 shrink-0 rounded-xl border-2 border-stone-200 bg-white p-2" dangerouslySetInnerHTML={{ __html: qrSvg }} />
      <div className="space-y-3">
        <p className="font-mono text-lg font-bold">{display}</p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={async () => {
              try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch {}
            }}
            className={btn}
          >
            {copied ? "Copied!" : "Copy link"}
          </button>
          <a href={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(qrSvg)}`} download={`${display.split("/").pop()}-qr.svg`} className={`${ghost} px-4 py-2`}>
            Download QR
          </a>
        </div>
        <p className="text-sm text-stone-500">Stick the QR code on a flyer, a sticker, or your forehead.</p>
      </div>
    </div>
  );
}

export function TipsForm({ tips }: { tips: Tips }) {
  const [state, action, pending] = useActionState(updateTips, undefined);
  return (
    <form action={action} className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-2">
        {TIP_PROVIDERS.map((p) => (
          <label key={p.id} className="flex items-center gap-2">
            <span aria-hidden className="w-6 text-center">{p.emoji}</span>
            <span className="sr-only">{p.label}</span>
            <input name={p.id} defaultValue={tips[p.id] ?? ""} placeholder={`${p.label}: ${p.placeholder}`} className={input} />
          </label>
        ))}
      </div>
      <div className="flex items-center gap-3">
        <button disabled={pending} className={btn}>{pending ? "Saving…" : "Save tip jar"}</button>
        <Saved show={!!state?.ok && !pending} />
        {state?.error && <span className="text-sm text-red-600">{state.error}</span>}
      </div>
    </form>
  );
}

export function SignupSettings({ enabled, prompt, count }: { enabled: boolean; prompt: string; count: number }) {
  const [state, action, pending] = useActionState(updateSignup, undefined);
  return (
    <form action={action} className="space-y-3">
      <label className="flex items-center gap-2 text-sm font-semibold">
        <input type="checkbox" name="signupEnabled" defaultChecked={enabled} className="h-4 w-4 accent-lime-500" />
        Show an email signup box on my page
      </label>
      <input name="signupPrompt" defaultValue={prompt} maxLength={80} placeholder="Join my email list" aria-label="Signup box heading" className={input} />
      <div className="flex flex-wrap items-center gap-3">
        <button disabled={pending} className={btn}>{pending ? "Saving…" : "Save"}</button>
        <Saved show={!!state?.ok && !pending} />
        <span className="text-sm text-stone-500">{count} subscriber{count === 1 ? "" : "s"}</span>
        {count > 0 && (
          <a href="/dashboard/subscribers" download className="text-sm font-semibold underline decoration-lime-500 decoration-2 underline-offset-2">
            Download CSV
          </a>
        )}
      </div>
    </form>
  );
}
