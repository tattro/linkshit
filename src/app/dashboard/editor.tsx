"use client";

import NextLink from "next/link";
import { startTransition, useActionState, useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { deleteMessage, updateContact } from "@/app/actions/contact";
import { answerQuestion, deleteQuestion, updateQA } from "@/app/actions/qa";
import { addLink, deleteLink, deleteLinkForever, importLinktree, restorePage, reviveLink, updateHeading, updateLink, type ActionState } from "@/app/actions/links";
import {
  changeHandle, removeAvatar, removeBackground, updateLook, updateProfile, updateSignup, updateSocials, updateTips, uploadAvatar, uploadBackground,
} from "@/app/actions/profile";
import { changeEmail, changePassword, resendVerification } from "@/app/actions/auth";
import { deleteAccount } from "@/app/actions/account";
import { deletePage } from "@/app/actions/pages";
import { stealLook, undoSteal } from "@/app/actions/steal";
import { setAdvertiserOptIn } from "@/app/actions/marketplace";
import type { Link, Socials, Style, Tips } from "@/db/schema";
import { setLookDraft } from "./lookDraft";
import { AvatarCropper } from "./AvatarCropper";
import { GENERAL_CATEGORIES } from "@/lib/creatorTypes";
import { isMusicUrl } from "@/lib/music";
import { isStoreUrl } from "@/lib/stores";
import { LATEST_LABEL, latestKind } from "@/lib/feeds";
import { countryName, GEO_COUNTRIES, MAX_GEO_RULES, type GeoRule } from "@/lib/geo";
import { embedFor } from "@/lib/embeds";
import { TIP_PROVIDERS } from "@/lib/tips";
import { FONTS, parseStyle, GRADIENT_DIRS, GRADIENT_PRESETS, SHAPES, gradientCss, hasCustomColors } from "@/lib/style";
import { THEMES } from "@/lib/themes";

export const input = "w-full rounded-lg border-2 border-stone-300 bg-white px-3 py-2 outline-none placeholder:italic placeholder:text-stone-400 focus:border-stone-900";
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

const isSoundCloud = (url: string) => /^(https?:\/\/)?(www\.|m\.)?soundcloud\.com(\/|$)/i.test(url.trim());

function LinkExtras({ link, url, adultDefault = false, onSoundCloud }: { link?: Link; url: string; adultDefault?: boolean; onSoundCloud?: () => void }) {
  // Adult pages: new links start with the 18+ warning ticked
  const [open, setOpen] = useState(Boolean(
    link?.startsAt || link?.endsAt || link?.lockCode || link?.androidUrl || link?.geo?.length || link?.thumbVersion ||
    link?.spotlight || link?.icon || link?.discountCode || link?.price,
  ));
  const canEmbed = url.trim() !== "" && embedFor(/^https?:\/\//i.test(url.trim()) ? url.trim() : `https://${url.trim()}`) !== null;
  const feedKind = latestKind(url);
  const canGrab = url.trim() !== "" && !isMusicUrl(url) && !canEmbed && !feedKind;
  // "This is music" ticks itself for song links and SoundCloud; people can still tick or untick it
  const [musicChoice, setMusicChoice] = useState<boolean | null>(link ? Boolean(link.music || link.featured) || null : null);
  const musicOn = musicChoice ?? (isMusicUrl(url) || isSoundCloud(url));
  return (
    <div className="sm:col-span-full">
      <TzInput />
      <label className="mb-2 flex items-center gap-2 text-sm">
        <input type="checkbox" checked={musicOn} onChange={(e) => setMusicChoice(e.target.checked)} className="h-4 w-4 accent-lime-500" />
        🎵 This is music <span className="text-stone-400">(a song, album or SoundCloud)</span>
      </label>
      {musicOn && (
        <div className="mb-3 space-y-2 rounded-xl border-2 border-lime-200 bg-lime-50 p-3 text-sm">
          {isMusicUrl(url) ? (
            <>
              <label className="flex items-start gap-2">
                <input type="checkbox" name="music" defaultChecked={link ? Boolean(link.music) : true} className="mt-0.5 h-4 w-4 accent-lime-500" />
                <span>Add &quot;Listen on Spotify, Apple Music, YouTube&quot; buttons <span className="text-stone-400">(we find it on every app for you)</span></span>
              </label>
              <label className="flex items-start gap-2">
                <input type="checkbox" name="featured" defaultChecked={link?.featured} className="mt-0.5 h-4 w-4 accent-lime-500" />
                <span>⭐ Feature this song at the top of my page <span className="text-stone-400">(big player with Spotify, Apple Music and YouTube buttons · one song at a time)</span></span>
              </label>
            </>
          ) : isSoundCloud(url) ? (
            <p className="text-stone-600">SoundCloud shows up as a player on your page.</p>
          ) : (
            <p className="text-stone-600">Paste a song or album link from Spotify, Apple Music or YouTube Music in the Link box. We&apos;ll find it on every app and can put a player at the top of your page.</p>
          )}
          {onSoundCloud && !isSoundCloud(url) && !isMusicUrl(url) && (
            <button
              type="button"
              onClick={onSoundCloud}
              className="rounded-full border-2 border-dashed border-orange-300 bg-white px-3 py-1 text-orange-700 hover:border-orange-500"
            >
              😔 I&apos;m lame, I&apos;m a SoundCloud rapper/DJ
            </button>
          )}
        </div>
      )}
      <label className="mb-2 flex items-center gap-2 text-sm">
        <input type="checkbox" name="sensitive" defaultChecked={link ? link.sensitive : adultDefault} className="h-4 w-4 accent-lime-500" />
        🔞 18+ warning before it opens
      </label>
      {feedKind && (
        <label className="mb-2 flex items-start gap-2 text-sm">
          <input type="checkbox" name="latest" defaultChecked={link ? Boolean(link.latest) : true} className="mt-0.5 h-4 w-4 accent-lime-500" />
          <span>
            {LATEST_LABEL[feedKind].checkbox}{" "}
            <span className="text-stone-400">(updates by itself)</span>
          </span>
        </label>
      )}
      {canGrab && (
        <label className="mb-2 flex items-start gap-2 text-sm">
          {/* key: re-apply the default when the link changes from/to a shop */}
          <input key={String(isStoreUrl(url))} type="checkbox" name="grab" defaultChecked={!link && isStoreUrl(url)} className="mt-0.5 h-4 w-4 accent-lime-500" />
          <span>🛍️ Grab the product picture and price from the page <span className="text-stone-400">(great for courses, merch and shops)</span></span>
        </label>
      )}
      {canEmbed && (
        <label className="mb-2 flex items-center gap-2 text-sm">
          {/* SoundCloud has no "listen on" lookup, so new SoundCloud links default to the player */}
          <input key={String(isSoundCloud(url))} type="checkbox" name="embed" defaultChecked={link ? link.embed : isSoundCloud(url)} className="h-4 w-4 accent-lime-500" />
          Show it right on my page (player or booking calendar) instead of a button
        </label>
      )}
      {!open ? (
        <button type="button" onClick={() => setOpen(true)} className="text-sm text-stone-500 underline">
          ⚙️ More options (icon, spotlight, discount code, schedule, lock…)
        </button>
      ) : (
        <div className="space-y-3 rounded-xl bg-stone-50 p-3">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
            <label className="flex items-center gap-2">
              <input type="checkbox" name="spotlight" defaultChecked={link?.spotlight} className="h-4 w-4 accent-lime-500" />
              ✨ Spotlight (wiggles)
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
          <label className="block text-sm">
            <span className="font-medium">🏷️ Discount code</span> <span className="text-xs text-stone-400">optional · tapping the link copies it, then opens the link</span>
            <input
              name="discountCode"
              defaultValue={link?.discountCode ?? ""}
              maxLength={40}
              autoComplete="off"
              placeholder="e.g. TREVOR20"
              className="mt-1 w-full rounded-lg border-2 border-stone-300 bg-white px-3 py-2 font-mono outline-none focus:border-stone-900"
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium">💲 Price</span> <span className="text-xs text-stone-400">optional · shown on the button</span>
            <input
              name="price"
              defaultValue={link?.price ?? ""}
              maxLength={20}
              autoComplete="off"
              placeholder="e.g. $29 or Free"
              className="mt-1 w-full rounded-lg border-2 border-stone-300 bg-white px-3 py-2 outline-none focus:border-stone-900"
            />
          </label>
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="text-sm">
              <label className="block">
                <span className="text-stone-500">Show from (optional)</span>
                <input type="datetime-local" name="startsAt" defaultValue={toLocalInput(link?.startsAt ?? null)} className={input} />
              </label>
              <label className="mt-1 flex items-center gap-2">
                <input type="checkbox" name="countdown" defaultChecked={link?.countdown} className="h-4 w-4 accent-lime-500" />
                <span>⏳ Show a countdown until then</span>
              </label>
            </div>
            <label className="text-sm">
              <span className="text-stone-500">Hide after (optional)</span>
              <input type="datetime-local" name="endsAt" defaultValue={toLocalInput(link?.endsAt ?? null)} className={input} />
            </label>
          </div>
          <div className="text-sm">
            <span className="text-stone-500">Thumbnail image (optional, replaces the icon)</span>
            <div className="mt-1 flex flex-wrap items-center gap-3">
              {link && link.thumbVersion > 0 && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={`/thumb/${link.id}?v=${link.thumbVersion}`} alt="" className="h-10 w-10 rounded-lg object-cover" />
              )}
              <input type="file" name="thumb" accept="image/jpeg,image/png,image/webp" className="min-w-0 max-w-full text-sm file:mr-2 file:rounded-lg file:border-2 file:border-stone-300 file:bg-white file:px-2 file:py-1" />
              {link && link.thumbVersion > 0 && (
                <label className="flex items-center gap-1.5">
                  <input type="checkbox" name="removeThumb" className="h-4 w-4 accent-lime-500" /> Remove
                </label>
              )}
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="text-sm">
              <span className="text-stone-500">🔒 Lock with a code (optional)</span>
              <input name="lockCode" defaultValue={link?.lockCode ?? ""} maxLength={40} autoComplete="off" placeholder="e.g. secret123" className={input} />
            </label>
            <label className="text-sm">
              <span className="text-stone-500">Different link for Android (optional)</span>
              <input name="androidUrl" defaultValue={link?.androidUrl ?? ""} placeholder="play.google.com/store/apps/…" className={input} />
            </label>
          </div>
          <GeoRules rules={link?.geo ?? []} />
        </div>
      )}
    </div>
  );
}

/** Up to 3 "visitors from X go to Y" rows. Empty rows are ignored. */
function GeoRules({ rules }: { rules: GeoRule[] }) {
  const [count, setCount] = useState(Math.max(1, rules.length));
  return (
    <div className="text-sm">
      <span className="text-stone-500">🌍 Send some countries somewhere else (optional) · e.g. UK fans to your UK store</span>
      <div className="mt-1 space-y-2">
        {Array.from({ length: count }, (_, i) => (
          <div key={i} className="grid gap-1 sm:grid-cols-[10rem_1fr] sm:gap-2">
            <select name="geoCountry" defaultValue={rules[i]?.c ?? ""} aria-label={`Country ${i + 1}`} className={input}>
              <option value="">Country…</option>
              {GEO_COUNTRIES.map((c) => <option key={c} value={c}>{countryName(c)}</option>)}
            </select>
            <input name="geoUrl" defaultValue={rules[i]?.url ?? ""} aria-label={`Link for country ${i + 1}`} placeholder="where they go instead" className={input} />
          </div>
        ))}
      </div>
      {count < MAX_GEO_RULES && (
        <button type="button" onClick={() => setCount(count + 1)} className="mt-1 text-xs text-stone-500 underline">+ another country</button>
      )}
    </div>
  );
}

export type SectionOption = { id: number; title: string };

/**
 * "Category": type a name like Music. An existing one is reused (suggested as
 * you type), a new one is created as a title on the page, blank means none.
 */
function CategoryBox({ sections, ideas = GENERAL_CATEGORIES, defaultValue = "", className = "" }: { sections: SectionOption[]; ideas?: string[]; defaultValue?: string; className?: string }) {
  const [value, setValue] = useState(defaultValue);
  const listId = useId();
  const typed = value.trim().toLowerCase();
  const isNew = typed !== "" && !sections.some((s) => s.title.trim().toLowerCase() === typed);
  return (
    <label className={`block min-w-0 ${className}`}>
      <span className="text-sm font-semibold">➕ Category</span> <span className="text-xs text-stone-400">optional</span>
      <input
        name="sectionName"
        list={listId}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        maxLength={60}
        autoComplete="off"
        placeholder="Pick one or type your own (or leave blank)"
        className={`${input} mt-1`}
      />
      <datalist id={listId}>
        {sections.map((s) => <option key={s.id} value={s.title} />)}
        {ideas.filter((idea) => !sections.some((s) => s.title.trim().toLowerCase() === idea.toLowerCase())).map((idea) => (
          <option key={idea} value={idea} />
        ))}
      </datalist>
      {isNew && <span className="mt-1 block text-xs text-stone-500">New category: &quot;{value.trim()}&quot; will show as a title on your page, with this link under it.</span>}
      {!isNew && sections.length > 0 && typed === "" && (
        <span className="mt-1 block text-xs text-stone-500">Yours so far: {sections.map((s) => s.title).join(", ")}</span>
      )}
    </label>
  );
}

export function AddLinkForm({ sections = [], ideas, linkPlaceholder = "yourwebsite.com", defaultCategory = "", adultDefault = false }: { sections?: SectionOption[]; ideas?: string[]; linkPlaceholder?: string; defaultCategory?: string; adultDefault?: boolean }) {
  const [state, action, pending] = useActionState(addLink, undefined);
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [key, setKey] = useState(0);
  const formRef = useRef<HTMLFormElement>(null);
  const [handled, setHandled] = useState<ActionState>(undefined);
  if (state !== handled) {
    setHandled(state);
    if (state?.ok) { setUrl(""); setTitle(""); setKey((k) => k + 1); }
  }
  return (
    <form key={key} ref={formRef} action={action} className="grid gap-3 sm:grid-cols-[1fr_1.5fr] sm:items-end">
      <label className="block min-w-0">
        <span className="text-sm font-semibold">Title</span>
        <input name="title" required maxLength={100} placeholder="My website" value={title} onChange={(e) => setTitle(e.target.value)} className={`${input} mt-1`} />
      </label>
      <label className="block min-w-0">
        <span className="text-sm font-semibold">Link</span>
        <input name="url" inputMode="url" autoCapitalize="off" autoCorrect="off" spellCheck={false} placeholder={linkPlaceholder} value={url} onChange={(e) => setUrl(e.target.value)} className={`${input} mt-1`} />
      </label>
      <CategoryBox key={key} sections={sections} ideas={ideas} defaultValue={defaultCategory} className="sm:col-span-2" />
      <button disabled={pending} className={`${btn} sm:col-span-2 sm:justify-self-start`}>{pending ? "Adding…" : "Add link"}</button>
      {state?.error && <p className="text-sm font-semibold text-red-600 sm:col-span-2">{state.error}</p>}
      <LinkExtras
        url={url}
        adultDefault={adultDefault}
        onSoundCloud={() => {
          setUrl("soundcloud.com/");
          if (!title.trim()) setTitle("My SoundCloud");
          const el = formRef.current?.elements.namedItem("url");
          if (el instanceof HTMLInputElement) requestAnimationFrame(() => { el.focus(); el.setSelectionRange(el.value.length, el.value.length); });
        }}
      />
    </form>
  );
}

function HeadingItem({ link, handle }: { link: Link; handle?: React.ReactNode }) {
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [state, action, pending] = useActionState(async (prev: ActionState, fd: FormData) => {
    const result = await updateHeading(prev, fd);
    if (result?.ok) setEditing(false);
    return result;
  }, undefined);
  return (
    <div className="rounded-xl border-2 border-dashed border-stone-300 bg-stone-50 p-3">
      <div className="flex items-center gap-3">
        {handle}
        {editing ? (
          <form action={action} className="flex min-w-0 flex-1 flex-wrap gap-2">
            <input type="hidden" name="id" value={link.id} />
            <input name="title" defaultValue={link.title} required maxLength={60} autoFocus className={`${input} min-w-0 flex-1`} />
            <button disabled={pending} className={btn}>Save</button>
            <button type="button" onClick={() => setEditing(false)} className={ghost}>Cancel</button>
            {state?.error && <p className="w-full text-sm text-red-600">{state.error}</p>}
          </form>
        ) : (
          <>
            <p className="min-w-0 flex-1 truncate text-sm font-bold uppercase tracking-widest text-stone-600">
              <span className="mr-2 rounded bg-stone-200 px-1.5 py-0.5 text-[10px] font-medium normal-case tracking-normal text-stone-600">category</span>
              {link.title}
            </p>
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
          </>
        )}
      </div>
    </div>
  );
}

/** Download the page as a file, or put it back from one. */
export function BackupForm() {
  const [state, action, pending] = useActionState(restorePage, undefined);
  const [file, setFile] = useState<File | null>(null);
  return (
    <div className="space-y-4">
      <p className="text-sm text-stone-500">Your page is yours. Download everything (links, look, photos, settings) as one file, and put it back any time.</p>
      <a href="/dashboard/backup" download className={`${btn} inline-block`}>⬇️ Download my page</a>
      <form action={action} className="space-y-2 border-t border-stone-200 pt-4">
        <label className="block text-sm font-semibold" htmlFor="backup-file">Restore from a backup</label>
        <input
          id="backup-file"
          type="file"
          name="backup"
          accept="application/json,.json"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="block w-full min-w-0 text-sm file:mr-2 file:rounded-lg file:border-2 file:border-stone-300 file:bg-white file:px-2 file:py-1"
        />
        {file && <p className="text-xs text-stone-500">Your current links move to the graveyard (you can bring them back), and the look and settings are replaced.</p>}
        <button disabled={pending || !file} className={`${ghost} disabled:opacity-50`}>{pending ? "Restoring…" : "Restore"}</button>
        {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
        {state?.ok && <p className="text-sm text-lime-700">Restored. Welcome back.</p>}
      </form>
    </div>
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

export function LinkItem({ link, handle, sections = [], section = "none" }: { link: Link; handle?: React.ReactNode; sections?: SectionOption[]; section?: string }) {
  if (link.heading) return <HeadingItem link={link} handle={handle} />;
  return <LinkRowItem link={link} handle={handle} sections={sections} section={section} />;
}

function LinkRowItem({ link, handle, sections, section }: { link: Link; handle?: React.ReactNode; sections: SectionOption[]; section: string }) {
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
      <div className="rounded-xl border-2 border-stone-900 bg-white p-3">
        <form action={action} className="grid gap-2">
          <input type="hidden" name="id" value={link.id} />
          <input name="title" defaultValue={link.title} required maxLength={100} className={input} />
          <input name="url" value={url} onChange={(e) => setUrl(e.target.value)} required className={input} />
          {!link.offerId && <CategoryBox sections={sections} defaultValue={sections.find((s) => String(s.id) === section)?.title ?? ""} />}
          <LinkExtras link={link} url={url} />
          {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
          <div className="flex gap-2">
            <button disabled={pending} className={btn}>Save</button>
            <button type="button" onClick={() => setEditing(false)} className={ghost}>Cancel</button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="rounded-xl border-2 border-stone-200 bg-white p-3">
      <div className="flex items-center gap-3">
        {handle}
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">
            {link.icon && <span className="mr-1">{link.icon}</span>}
            {link.title}
            {link.embed && <span className="ml-2 rounded bg-violet-100 px-1.5 py-0.5 text-xs font-medium text-violet-800">embed</span>}
            {link.featured && <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-800">⭐ featured</span>}
            {link.spotlight && <span className="ml-2 rounded bg-yellow-100 px-1.5 py-0.5 text-xs font-medium text-yellow-800">✨ spotlight</span>}
            {link.sensitive && <span className="ml-2 rounded bg-red-100 px-1.5 py-0.5 text-xs font-medium text-red-800">🔞 18+</span>}
            {link.music && <span className="ml-2 rounded bg-pink-100 px-1.5 py-0.5 text-xs font-medium text-pink-800">🎵 {link.music.links.length} apps</span>}
            {link.latest?.item && <span className="ml-2 rounded bg-red-100 px-1.5 py-0.5 text-xs font-medium text-red-800">{LATEST_LABEL[link.latest.kind].emoji} newest: {link.latest.item.title.slice(0, 30)}</span>}
            {link.price && <span className="ml-2 rounded bg-emerald-100 px-1.5 py-0.5 text-xs font-medium text-emerald-800">{link.price}</span>}
            {link.discountCode && <span className="ml-2 rounded bg-sky-100 px-1.5 py-0.5 text-xs font-medium text-sky-800">🏷️ {link.discountCode}</span>}
            {link.lockCode && <span className="ml-2 rounded bg-stone-200 px-1.5 py-0.5 text-xs font-medium text-stone-700">🔒 locked</span>}
            {link.offerId && <span className="ml-2 rounded bg-lime-100 px-1.5 py-0.5 text-xs font-medium text-lime-800" title="Pinned to the bottom of your page with an affiliate disclaimer">💸 marketplace</span>}
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
    </div>
  );
}

function Saved({ show }: { show: boolean }) {
  return show ? <span className="text-sm text-lime-700">Saved.</span> : null;
}

export function ProfileForm({ user }: { user: { displayName: string; bio: string; statsEmail: "week" | "month" | "off" } }) {
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
      <label className="flex items-center gap-2 text-sm">
        <span>Email me my stats</span>
        <select name="statsEmail" defaultValue={user.statsEmail} className="rounded-lg border-2 border-stone-300 bg-white px-2 py-1 outline-none focus:border-stone-900">
          <option value="week">Every week</option>
          <option value="month">Every month</option>
          <option value="off">Never</option>
        </select>
      </label>
      <div className="flex items-center gap-3">
        <button disabled={pending} className={btn}>{pending ? "Saving…" : "Save"}</button>
        <Saved show={!!state?.ok && !pending} />
        {state?.error && <span className="text-sm text-red-600">{state.error}</span>}
      </div>
    </form>
  );
}

/** Profile photo: pick an image, crop it in the browser, upload a 400px WebP. */
export function AvatarForm({ current, initial }: { current: string | null; initial: string }) {
  const [state, action, pending] = useActionState(uploadAvatar, undefined);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const [cropping, setCropping] = useState<File | null>(null);

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError(null);
    if (!file.type.startsWith("image/")) return setError("That's not an image.");
    setCropping(file);
  }

  function upload(blob: Blob) {
    setCropping(null);
    setBusy(true);
    const fd = new FormData();
    fd.set("avatar", new File([blob], "avatar.webp", { type: "image/webp" }));
    startTransition(() => action(fd));
    setBusy(false);
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
      {cropping && <AvatarCropper file={cropping} onCancel={() => setCropping(null)} onDone={upload} />}
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

  const extraFont = FONTS.find((f) => f.more && f.id === s.font);
  const [moreFonts, setMoreFonts] = useState(false);
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
              <input
                type="radio"
                name="theme"
                value={t.id}
                defaultChecked={user.theme === t.id}
                // Picking a theme means "use this theme": drop stolen/custom colours and gradients
                onClick={() => setCustom(false)}
                className="peer sr-only"
              />
              <div data-keep-colors className={`flex h-16 items-end rounded-lg p-2 text-xs font-bold ring-stone-900 ring-offset-2 peer-checked:ring-4 peer-focus-visible:ring-4 ${t.page}`}>
                {t.name}
              </div>
            </label>
          ))}
        </div>
        {custom && (
          <p className="mt-2 text-xs text-stone-500">
            Your own colours are on top of the theme right now. Tap any theme to go back to its original colours.
          </p>
        )}
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
          {FONTS.filter((f) => !f.more).map((f) => (
            <FontChip key={f.id} font={f} current={s.font} />
          ))}
          <button
            type="button"
            onClick={() => setMoreFonts((o) => !o)}
            aria-expanded={moreFonts}
            className="rounded-lg border-2 border-dashed border-stone-400 px-4 py-2 text-sm font-semibold text-stone-600 hover:border-stone-900 hover:text-stone-900"
          >
            {moreFonts ? "Fewer fonts ▴" : `More fonts ▾${extraFont ? ` (${extraFont.name})` : ""}`}
          </button>
        </div>
        {/* Always rendered so a picked extra font still submits when the list is closed */}
        <div className={`mt-2 grid grid-cols-2 gap-2 rounded-xl border-2 border-stone-200 bg-stone-50 p-2 sm:grid-cols-4 ${moreFonts ? "" : "hidden"}`}>
          {FONTS.filter((f) => f.more).map((f) => (
            <FontChip key={f.id} font={f} current={s.font} small />
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
                data-keep-colors
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
                  data-keep-colors
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
        {/* Always warning red: a plain hex colour (older iPhones skip Tailwind's newer colour format)
            and data-keep-colors so dashboard dark mode doesn't flip it */}
        <label data-keep-colors className="flex cursor-pointer items-center gap-2 text-sm font-black uppercase tracking-wide" style={{ color: "#dc2626" }}>
          <input type="checkbox" name="chaos" defaultChecked={s.chaos} className="h-5 w-5" style={{ accentColor: "#dc2626" }} />
          ⚠️ Chaos mode (don&apos;t press this)
        </label>
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

/** Puts a photo in the middle of a QR SVG (on a white tile so it still scans). */
function withLogo(svg: string, dataUrl: string) {
  const n = Number(/viewBox="0 0 (\d+) /.exec(svg)?.[1] ?? 0);
  if (!n) return svg;
  const size = n * 0.24, pad = n * 0.03, at = (n - size) / 2;
  const tile = `<rect x="${at - pad}" y="${at - pad}" width="${size + pad * 2}" height="${size + pad * 2}" rx="${pad * 1.5}" fill="#ffffff"/>`;
  const img = `<image href="${dataUrl}" x="${at}" y="${at}" width="${size}" height="${size}" preserveAspectRatio="xMidYMid slice" clip-path="url(#qrlogo)"/>`;
  const clip = `<defs><clipPath id="qrlogo"><rect x="${at}" y="${at}" width="${size}" height="${size}" rx="${pad}"/></clipPath></defs>`;
  return svg.replace("</svg>", `${clip}${tile}${img}</svg>`);
}

async function toDataUrl(src: string) {
  const blob = await (await fetch(src)).blob();
  return await new Promise<string>((resolve) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.readAsDataURL(blob);
  });
}

async function svgToPng(svg: string, px = 1024) {
  const img = new Image();
  img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  await img.decode();
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = px;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0, px, px);
  return canvas.toDataURL("image/png");
}

export function ShareCard({ url, qrUrl, avatar, scans }: { url: string; qrUrl: string; avatar: string | null; scans: number }) {
  const [copied, setCopied] = useState(false);
  const [color, setColor] = useState("#1c1917");
  const [logo, setLogo] = useState(Boolean(avatar));
  const [svg, setSvg] = useState("");
  const display = url.replace(/^https?:\/\//, "");
  const name = display.split("/").pop();

  useEffect(() => {
    let live = true;
    (async () => {
      const QRCode = (await import("qrcode")).default;
      let out = await QRCode.toString(qrUrl, { type: "svg", margin: 1, errorCorrectionLevel: logo && avatar ? "H" : "M", color: { dark: color, light: "#ffffff" } });
      if (logo && avatar) {
        try { out = withLogo(out, await toDataUrl(avatar)); } catch {}
      }
      if (live) setSvg(out);
    })();
    return () => { live = false; };
  }, [qrUrl, color, logo, avatar]);

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
      <div data-keep-colors className="h-40 w-40 shrink-0 rounded-xl border-2 border-stone-200 bg-white p-2" dangerouslySetInnerHTML={{ __html: svg }} />
      <div className="min-w-0 space-y-3">
        <p className="break-all font-mono text-lg font-bold">{display}</p>
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
          <button
            type="button"
            disabled={!svg}
            onClick={async () => {
              const a = document.createElement("a");
              a.href = await svgToPng(svg);
              a.download = `${name}-qr.png`;
              a.click();
            }}
            className={`${ghost} px-4 py-2`}
          >
            Download PNG
          </button>
          <a href={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`} download={`${name}-qr.svg`} className={`${ghost} px-4 py-2`}>
            SVG
          </a>
        </div>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
          <label className="flex items-center gap-2">
            QR color
            <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-7 w-10 cursor-pointer rounded border-2 border-stone-300" />
          </label>
          {avatar && (
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={logo} onChange={(e) => setLogo(e.target.checked)} className="h-4 w-4 accent-lime-500" />
              My photo in the middle
            </label>
          )}
        </div>
        <p className="text-sm text-stone-500">
          Scanned {scans.toLocaleString()} time{scans === 1 ? "" : "s"} so far. Stick it on a flyer, a sticker, or your forehead.
        </p>
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

function AnswerForm({ id, answer }: { id: number; answer?: string }) {
  const [state, action, pending] = useActionState(answerQuestion, undefined);
  return (
    <form action={action} className="mt-2 space-y-2">
      <input type="hidden" name="id" value={id} />
      <textarea name="answer" required maxLength={1000} rows={2} defaultValue={answer} placeholder="Your answer (posts it to your page)" className={input} />
      <div className="flex items-center gap-2">
        <button disabled={pending} className={`${btn} px-3 py-1.5 text-sm`}>{pending ? "Posting…" : answer ? "Update answer" : "Answer & post"}</button>
        {state?.error && <span className="text-sm text-red-600">{state.error}</span>}
      </div>
    </form>
  );
}

export function QASettings({ enabled, prompt, waiting, answered }: {
  enabled: boolean;
  prompt: string;
  waiting: { id: number; body: string; createdAt: Date }[];
  answered: { id: number; body: string; answer: string; answeredAt: Date }[];
}) {
  const [state, action, pending] = useActionState(updateQA, undefined);
  const [showPosted, setShowPosted] = useState(false);
  const del = (id: number, label: string) => (
    <form action={deleteQuestion}>
      <input type="hidden" name="id" value={id} />
      <button className="text-xs text-stone-400 hover:text-red-600">{label}</button>
    </form>
  );
  return (
    <div className="space-y-4">
      <form action={action} className="space-y-3">
        <p className="-mt-2 text-sm text-stone-500">Visitors ask you anything, anonymously. Nothing shows on your page until you answer it, then it joins a scrollable Q&amp;A feed.</p>
        <label className="flex items-center gap-2 text-sm font-semibold">
          <input type="checkbox" name="qaEnabled" defaultChecked={enabled} className="h-4 w-4 accent-lime-500" />
          Let visitors ask me anonymous questions
        </label>
        <input name="qaPrompt" defaultValue={prompt} maxLength={60} placeholder="💬 Talk to me" aria-label="Button text" className={input} />
        <div className="flex items-center gap-3">
          <button disabled={pending} className={btn}>{pending ? "Saving…" : "Save"}</button>
          <Saved show={!!state?.ok && !pending} />
        </div>
      </form>
      <div>
        <p className="text-sm font-semibold">🕵️ Waiting for you ({waiting.length})</p>
        {waiting.length === 0 && <p className="mt-1 text-xs text-stone-400">No new questions. Share your page and they&apos;ll roll in.</p>}
        <ul className="mt-2 space-y-2">
          {waiting.map((q) => (
            <li key={q.id} className="rounded-xl border-2 border-stone-200 p-3 text-sm">
              <div className="flex items-start justify-between gap-2">
                <p className="min-w-0 whitespace-pre-wrap break-words">{q.body}</p>
                {del(q.id, "Delete")}
              </div>
              <AnswerForm id={q.id} />
            </li>
          ))}
        </ul>
      </div>
      {answered.length > 0 && (
        <div>
          <button type="button" onClick={() => setShowPosted((o) => !o)} className="text-sm font-semibold underline decoration-lime-500 decoration-2 underline-offset-2">
            ✅ Posted on your page ({answered.length}) {showPosted ? "▴" : "▾"}
          </button>
          {showPosted && (
            <ul className="mt-2 space-y-2">
              {answered.map((q) => (
                <li key={q.id} className="rounded-xl border-2 border-stone-200 p-3 text-sm">
                  <div className="flex items-start justify-between gap-2">
                    <p className="min-w-0 whitespace-pre-wrap break-words text-stone-500">{q.body}</p>
                    {del(q.id, "Take down")}
                  </div>
                  <AnswerForm id={q.id} answer={q.answer} />
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

export function ContactSettings({ enabled, messages }: {
  enabled: boolean; messages: { id: number; name: string; email: string; body: string; createdAt: Date }[];
}) {
  const [state, action, pending] = useActionState(updateContact, undefined);
  return (
    <div className="space-y-4">
      <form action={action} className="space-y-3">
        <p className="-mt-2 text-sm text-stone-500">Adds a &quot;✉️ Message me&quot; button to your page. Messages show up here and in your email, and your address stays private.</p>
        <label className="flex items-center gap-2 text-sm font-semibold">
          <input type="checkbox" name="contactEnabled" defaultChecked={enabled} className="h-4 w-4 accent-lime-500" />
          Let visitors message me
        </label>
        <div className="flex items-center gap-3">
          <button disabled={pending} className={btn}>{pending ? "Saving…" : "Save"}</button>
          <Saved show={!!state?.ok && !pending} />
        </div>
      </form>
      {messages.length > 0 && (
        <ul className="space-y-2">
          {messages.map((m) => (
            <li key={m.id} className="rounded-xl border-2 border-stone-200 p-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <a href={`mailto:${m.email}`} className="min-w-0 truncate font-semibold underline decoration-lime-500 decoration-2 underline-offset-2">
                  {m.name ? `${m.name} · ` : ""}{m.email}
                </a>
                <span className="shrink-0 text-xs text-stone-400">{new Date(m.createdAt).toLocaleDateString()}</span>
              </div>
              <p className="mt-1 whitespace-pre-wrap break-words text-stone-700">{m.body}</p>
              <form action={deleteMessage} className="mt-1 text-right">
                <input type="hidden" name="id" value={m.id} />
                <button className="text-xs text-stone-400 hover:text-red-600">Delete</button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function SignupSettings({ enabled, prompt, count, recent }: {
  enabled: boolean; prompt: string; count: number; recent: { email: string; createdAt: Date }[];
}) {
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
      </div>
      <div className="rounded-xl border-2 border-stone-200 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold">📬 {count} subscriber{count === 1 ? "" : "s"}</p>
          {count > 0 ? (
            <a href="/dashboard/subscribers" download className="text-sm font-semibold underline decoration-lime-500 decoration-2 underline-offset-2">
              Download all (CSV)
            </a>
          ) : (
            <span className="text-xs text-stone-400">The CSV download shows up here once someone signs up.</span>
          )}
        </div>
        {recent.length > 0 && (
          <ul className="mt-3 space-y-1 text-sm">
            {recent.map((r) => (
              <li key={r.email} className="flex justify-between gap-3">
                <span className="truncate">{r.email}</span>
                <span className="shrink-0 text-stone-400">{new Date(r.createdAt).toLocaleDateString()}</span>
              </li>
            ))}
            {count > recent.length && <li className="text-xs text-stone-400">+ {count - recent.length} more in the CSV</li>}
          </ul>
        )}
      </div>
    </form>
  );
}

function FontChip({ font, current, small }: { font: { id: string; name: string; css: string }; current?: string; small?: boolean }) {
  return (
    <label className="cursor-pointer">
      <input type="radio" name="font" value={font.id} defaultChecked={(current ?? "sans") === font.id} className="peer sr-only" />
      <span
        style={{ fontFamily: font.css }}
        className={`block truncate rounded-lg border-2 border-stone-300 bg-white text-center peer-checked:border-stone-900 peer-checked:bg-lime-200 peer-focus-visible:ring-4 peer-focus-visible:ring-lime-300 ${
          small ? "px-2 py-2 text-base" : "inline-block px-4 py-2 text-lg"
        }`}
      >
        {font.name}
      </span>
    </label>
  );
}

/** Flushed links. Rest in links. */
export function Graveyard({ links }: { links: Link[] }) {
  if (links.length === 0) return null;
  return (
    <details className="mt-4 rounded-xl border-2 border-dashed border-stone-300 p-3">
      <summary className="cursor-pointer text-sm font-semibold text-stone-600">
        🪦 Link graveyard ({links.length}) <span className="font-normal text-stone-400">· rest in links</span>
      </summary>
      <ul className="mt-3 space-y-2">
        {links.map((l) => (
          <li key={l.id} className="flex items-center gap-3 rounded-lg bg-stone-50 p-2 text-sm">
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-stone-600">{l.icon && <span className="mr-1">{l.icon}</span>}{l.title}</p>
              <p className="truncate text-xs text-stone-400">{l.url} · {l.clicks} lifetime click{l.clicks === 1 ? "" : "s"}</p>
            </div>
            <form action={reviveLink}>
              <input type="hidden" name="id" value={l.id} />
              <button className="rounded-lg bg-lime-300 px-3 py-1 text-sm font-semibold text-stone-900 hover:bg-lime-400">Revive</button>
            </form>
            <ForeverButton id={l.id} />
          </li>
        ))}
      </ul>
    </details>
  );
}

function ForeverButton({ id }: { id: number }) {
  const [sure, setSure] = useState(false);
  if (!sure) return <button onClick={() => setSure(true)} className={`${ghost} hover:border-red-600 hover:text-red-600`}>Delete forever</button>;
  return (
    <form action={deleteLinkForever} className="flex gap-1">
      <input type="hidden" name="id" value={id} />
      <button className="rounded-lg bg-red-600 px-2 py-1 text-sm font-semibold text-white">Really?</button>
      <button type="button" onClick={() => setSure(false)} className={ghost}>No</button>
    </form>
  );
}

export function DeletePageForm({ handle }: { handle: string }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(deletePage, undefined);
  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="rounded-lg border-2 border-red-300 px-4 py-2 text-sm font-semibold text-red-700 hover:border-red-600 hover:bg-red-50">
        Delete this page
      </button>
    );
  }
  return (
    <form action={action} className="space-y-3 rounded-xl border-2 border-red-300 bg-red-50 p-4">
      <p className="text-sm text-red-900">
        Deletes linksh.it/{handle} with its links, photos, analytics and email list <strong>for good</strong>. Your account and other pages stay put.
      </p>
      <label className="block text-sm">
        Type <span className="font-mono font-bold">{handle}</span> to confirm
        <input name="handle" autoComplete="off" required className={input} />
      </label>
      {state?.error && <p className="text-sm text-red-700">{state.error}</p>}
      <div className="flex gap-2">
        <button disabled={pending} className="rounded-lg bg-red-600 px-4 py-2 font-semibold text-white hover:bg-red-700 disabled:opacity-50">
          {pending ? "Flushing…" : "Flush this page"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className={`${ghost} px-3 py-2`}>Never mind</button>
      </div>
    </form>
  );
}

export function DeleteAccountForm({ handle }: { handle: string }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(deleteAccount, undefined);
  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="rounded-lg border-2 border-red-300 px-4 py-2 text-sm font-semibold text-red-700 hover:border-red-600 hover:bg-red-50">
        Delete my account
      </button>
    );
  }
  return (
    <form action={action} className="space-y-3 rounded-xl border-2 border-red-300 bg-red-50 p-4">
      <p className="text-sm text-red-900">
        This deletes your account and every page on it (links, photos, analytics, email lists) <strong>for good</strong>, and frees up linksh.it/{handle} for someone else. No undo, no graveyard.
      </p>
      <label className="block text-sm">
        Type <span className="font-mono font-bold">{handle}</span> to confirm
        <input name="handle" autoComplete="off" required className={input} />
      </label>
      <label className="block text-sm">
        Your password
        <input name="password" type="password" autoComplete="current-password" required className={input} />
      </label>
      {state?.error && <p className="text-sm text-red-700">{state.error}</p>}
      <div className="flex gap-2">
        <button disabled={pending} className="rounded-lg bg-red-600 px-4 py-2 font-semibold text-white hover:bg-red-700 disabled:opacity-50">
          {pending ? "Flushing…" : "Flush my account"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className={`${ghost} px-3 py-2`}>Never mind</button>
      </div>
    </form>
  );
}

export function LinktreeImport() {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(importLinktree, undefined);
  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="mt-3 text-sm text-stone-500 underline">
        Moving from Linktree? Import your links
      </button>
    );
  }
  return (
    <form action={action} className="mt-4 space-y-2 rounded-xl bg-stone-50 p-3">
      <p className="text-sm font-semibold">Import from Linktree</p>
      <div className="flex gap-2">
        <input name="linktree" required placeholder="linktr.ee/yourname" aria-label="Your Linktree link" className={input} />
        <button disabled={pending} className={`${btn} shrink-0`}>{pending ? "Importing…" : "Import"}</button>
      </div>
      <p className="text-xs text-stone-500">Copies your public links (and name and bio, if yours are empty). Nothing on Linktree changes.</p>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state?.imported !== undefined && (
        <p className="text-sm text-lime-700">
          Imported {state.imported} link{state.imported === 1 ? "" : "s"}{state.skipped ? ` (skipped ${state.skipped} duplicate or unusable)` : ""}. Welcome to the better name. 💩
        </p>
      )}
    </form>
  );
}

export function HandleForm({ handle }: { handle: string }) {
  const [state, action, pending] = useActionState(changeHandle, undefined);
  const [value, setValue] = useState(handle);
  return (
    <form action={action} className="space-y-2">
      <label className="block text-sm font-semibold" htmlFor="handle-input">Your link</label>
      <div className="flex gap-2">
        <div className="flex min-w-0 flex-1 items-center rounded-lg border-2 border-stone-300 bg-white focus-within:border-stone-900">
          <span className="pl-3 font-mono text-sm text-stone-500">linksh.it/</span>
          <input
            id="handle-input"
            name="handle"
            value={value}
            onChange={(e) => setValue(e.target.value.toLowerCase())}
            maxLength={30}
            className="min-w-0 flex-1 bg-transparent py-2 pr-3 font-mono outline-none"
          />
        </div>
        <button disabled={pending || value === handle} className={`${btn} shrink-0`}>{pending ? "Changing…" : "Change"}</button>
      </div>
      {value !== handle && (
        <p className="text-xs text-stone-500">
          linksh.it/{handle} will keep redirecting to your new link for 30 days, then anyone can claim it. Update your bios and QR codes before then.
        </p>
      )}
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state?.ok && !pending && <p className="text-sm text-lime-700">Done. You&apos;re linksh.it/{handle} now.</p>}
    </form>
  );
}

/** Paste someone's page, take their design. Links and photos stay yours. */
export function StealLook() {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(stealLook, undefined);
  return (
    <div className="rounded-xl border-2 border-dashed border-stone-300 p-4">
      {!open ? (
        <button type="button" onClick={() => setOpen(true)} className="text-left">
          <span className="font-semibold">😈 Steal someone&apos;s look</span>
          <span className="block text-sm text-stone-500">Like how another page looks? Paste its link and take the design.</span>
        </button>
      ) : (
        <form action={action} className="space-y-2">
          <label className="block text-sm font-semibold" htmlFor="steal-source">😈 Whose look are we stealing?</label>
          <div className="flex gap-2">
            <input id="steal-source" name="source" required autoFocus autoComplete="off" placeholder="linksh.it/someone or linktr.ee/someone" className={input} />
            <button disabled={pending} className={`${btn} shrink-0`}>{pending ? "Stealing…" : "Steal it"}</button>
          </div>
          <p className="text-xs text-stone-500">Copies colors, gradient, font and button style. Never their links, photo or bio. Linktree designs are matched as closely as we can.</p>
          {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
        </form>
      )}
      {state?.ok && !pending && (
        <div className="mt-3 flex flex-wrap items-center gap-3 rounded-lg bg-lime-100 p-3 text-sm">
          <span className="font-semibold">{state.ok}</span>
          {state.previous && (
            <form action={undoSteal}>
              <input type="hidden" name="previous" value={JSON.stringify(state.previous)} />
              <button className={ghost}>Undo</button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}

/** Login settings: email and password. */
export function AccountSettings({ email }: { email: string }) {
  const [pwState, pwAction, pwPending] = useActionState(changePassword, undefined);
  const [emState, emAction, emPending] = useActionState(changeEmail, undefined);
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <form action={emAction} className="space-y-2">
        <p className="text-sm font-semibold">Email</p>
        <input name="email" type="email" required defaultValue={email} autoComplete="email" aria-label="New email" className={input} />
        <input name="password" type="password" required placeholder="Your password" autoComplete="current-password" aria-label="Password to confirm email change" className={input} />
        <button disabled={emPending} className={btn}>{emPending ? "Saving…" : "Change email"}</button>
        {emState?.error && <p className="text-sm text-red-600">{emState.error}</p>}
        {emState?.ok && !emPending && <p className="text-sm text-lime-700">{emState.ok}</p>}
      </form>
      <form action={pwAction} className="space-y-2">
        <p className="text-sm font-semibold">Password</p>
        <input name="current" type="password" required placeholder="Current password" autoComplete="current-password" aria-label="Current password" className={input} />
        <input name="password" type="password" required minLength={8} placeholder="New password (8+ characters)" autoComplete="new-password" aria-label="New password" className={input} />
        <input name="confirm" type="password" required placeholder="New password again" autoComplete="new-password" aria-label="Confirm new password" className={input} />
        <button disabled={pwPending} className={btn}>{pwPending ? "Saving…" : "Change password"}</button>
        {pwState?.error && <p className="text-sm text-red-600">{pwState.error}</p>}
        {pwState?.ok && !pwPending && <p className="text-sm text-lime-700">{pwState.ok}</p>}
      </form>
    </div>
  );
}

/** Opt-in only: nothing commercial ever lands on a page unless the creator picks it. */
export function AdvertiserOptIn({ optedIn }: { optedIn: boolean }) {
  const [state, action, pending] = useActionState(async (_: boolean | undefined, fd: FormData) => {
    await setAdvertiserOptIn(fd);
    return true;
  }, undefined);
  return (
    <form action={action} className="space-y-3">
      <label className="flex items-start gap-3">
        <input
          type="checkbox"
          name="optIn"
          defaultChecked={optedIn}
          onChange={(e) => e.currentTarget.form?.requestSubmit()}
          className="mt-1 h-4 w-4 shrink-0 accent-lime-500"
        />
        <span>I&apos;m open to advertisers reaching out to me so I can make money from my linksh.it</span>
      </label>
      <NextLink href="/dashboard/marketplace" className="ml-7 inline-block text-sm font-semibold underline decoration-lime-500 decoration-2 underline-offset-2">See how it works</NextLink>
      {state && !pending && <Saved show />}
    </form>
  );
}
