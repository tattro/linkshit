import NextLink from "next/link";
import type { Link as LinkRow, Socials, Style, Tips, User } from "@/db";
import { DEFAULT_PLAYER, musicLabel, PLAYER_APPS } from "@/lib/music";
import { siApplemusic, siSpotify, siYoutube, siYoutubemusic } from "simple-icons";
import { embedFor } from "@/lib/embeds";
import { iconForUrl, platform, PLATFORMS } from "@/lib/socials";
import { TIP_PROVIDERS } from "@/lib/tips";
import { SensitiveGate } from "./SensitiveGate";
import { LATEST_LABEL } from "@/lib/feeds";
import { DiscountLink } from "./DiscountLink";
import { SignupBox } from "./SignupBox";
import { ContactBox } from "./ContactBox";
import { AskBox } from "./AskBox";
import { Countdown } from "./Countdown";
import { ChaosMode } from "./ChaosMode";
import { backgroundImageStyle, buttonStyle, pageStyle } from "@/lib/style";
import { getTheme } from "@/lib/themes";

export type ProfileData = Pick<User, "id" | "handle" | "displayName" | "bio" | "theme" | "avatarVersion" | "bgVersion" | "signupEnabled" | "signupPrompt" | "contactEnabled" | "qaEnabled" | "qaPrompt"> & {
  style: Style;
  socials: Socials;
  tips: Tips;
};

export type ProfileLink = Pick<LinkRow, "id" | "title" | "url" | "embed" | "sensitive" | "spotlight" | "icon" | "offerId" | "thumbVersion" | "discountCode" | "heading" | "music" | "featured" | "videoUrl" | "price" | "latest"> & { dropsAt?: Date | null } & {
  locked?: boolean;
};

// The three apps most fans use get logo buttons; the rest sit behind "more apps"
const MAIN_APPS: Record<string, string> = { spotify: siSpotify.path, appleMusic: siApplemusic.path, youtube: siYoutube.path, youtubeMusic: siYoutubemusic.path };

type AppLink = { p: string; url: string };

/** music.youtube.com version of a YouTube link: fans land on the artist's real release, not a random upload. */
function toYoutubeMusic(url: string): string | null {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^(www|m)\./, "");
    if (host === "music.youtube.com") return url;
    if (host === "youtube.com" && u.pathname === "/watch" && u.searchParams.get("v")) return `https://music.youtube.com/watch?v=${u.searchParams.get("v")}`;
    if (host === "youtube.com" && u.pathname === "/results" && u.searchParams.get("search_query")) return `https://music.youtube.com/search?q=${encodeURIComponent(u.searchParams.get("search_query")!)}`;
    if (host === "youtu.be") return `https://music.youtube.com/watch?v=${u.pathname.slice(1)}`;
  } catch {}
  return null;
}

/** The three big buttons (Spotify, Apple Music, YouTube Music, the musician's pick first) and the rest. */
function splitApps(list: AppLink[], prefer: string = DEFAULT_PLAYER) {
  const ytSource = list.find((m) => m.p === "youtubeMusic") ?? list.find((m) => m.p === "youtube");
  const ytMusic = ytSource ? toYoutubeMusic(ytSource.url) : null;
  const byApp: Record<string, AppLink | undefined> = {
    spotify: list.find((m) => m.p === "spotify"),
    appleMusic: list.find((m) => m.p === "appleMusic"),
    youtube: ytMusic ? { p: "youtubeMusic", url: ytMusic } : undefined,
  };
  const order = [prefer, ...PLAYER_APPS.map((a) => a.id).filter((id) => id !== prefer)];
  const main = order.map((id) => byApp[id]).filter((m): m is AppLink => Boolean(m));
  const rest = list.filter((m) => !["spotify", "appleMusic", "youtube", "youtubeMusic"].includes(m.p));
  return { main, rest };
}

/** Player for the featured song: their music video if they added one, else the app they pasted from, then Spotify, Apple Music, YouTube Music. */
function featuredPlayer(l: ProfileLink) {
  const apps = l.music?.links ?? [];
  const yt = apps.find((m) => m.p === "youtubeMusic") ?? apps.find((m) => m.p === "youtube");
  // YouTube Music has no player of its own; the same track plays in YouTube's player
  const ytId = yt ? toYoutubeMusic(yt.url)?.match(/[?&]v=([\w-]{6,20})/)?.[1] : undefined;
  const byApp: Record<string, string | undefined> = {
    spotify: apps.find((m) => m.p === "spotify")?.url,
    appleMusic: apps.find((m) => m.p === "appleMusic")?.url,
    youtube: ytId ? `https://www.youtube.com/watch?v=${ytId}` : undefined,
  };
  const prefer = l.music?.prefer ?? DEFAULT_PLAYER;
  const tryUrls = [l.videoUrl ?? undefined, byApp[prefer], byApp.spotify, byApp.appleMusic, byApp.youtube, l.url.replace("://music.youtube.com/", "://www.youtube.com/")];
  for (const u of tryUrls) {
    const e = u ? embedFor(u) : null;
    if (e) return e;
  }
  return null;
}

export function avatarUrl(u: Pick<User, "id" | "avatarVersion">) {
  return u.avatarVersion > 0 ? `/avatar/${u.id}?v=${u.avatarVersion}` : null;
}

export function backgroundUrl(u: Pick<User, "id" | "bgVersion">) {
  return u.bgVersion > 0 ? `/bg/${u.id}?v=${u.bgVersion}` : null;
}

export function ProfileView({ user, links, preview = false, avatarOverride, qa = [] }: {
  user: ProfileData;
  qa?: { id: number; body: string; answer: string; answeredAt: Date }[];
  links: ProfileLink[];
  preview?: boolean;
  avatarOverride?: string | null;
}) {
  const theme = getTheme(user.theme);
  const name = user.displayName || user.handle;
  const avatar = avatarOverride !== undefined ? avatarOverride : avatarUrl(user);
  const socials = PLATFORMS.filter((p) => user.socials[p.id]);
  const tips = TIP_PROVIDERS.filter((p) => user.tips[p.id]);
  const btnClass = `block rounded-xl px-5 py-4 text-center font-semibold transition hover:-translate-y-0.5 ${theme.button}`;
  const bgUrl = backgroundUrl(user);
  // With a tinted background photo, flip text to match the tint unless the user picked a text colour.
  const tintText = bgUrl && user.style.bgTint ? (user.style.bgTint === "dark" ? "#ffffff" : "#1c1917") : undefined;
  const style = { ...user.style, text: user.style.text ?? tintText };
  const btnStyle = buttonStyle(style);
  const mutedStyle = style.text ? { color: style.text, opacity: 0.7 } : undefined;

  const appLink = (l: ProfileLink, m: { p: string; url: string }, big = false) => (
    <a
      key={m.p}
      // Straight to the app's own link so iPhones open the app instead of a "Get Spotify" page;
      // the click is counted by a ping instead of a redirect
      href={m.url}
      ping={preview ? undefined : `/go/${l.id}?to=${m.p}`}
      target={preview ? "_blank" : undefined}
      rel="noopener noreferrer nofollow"
      className={`tint inline-flex items-center gap-1.5 rounded-full font-semibold ${big ? "px-3.5 py-2 text-sm [--tint:0.12]" : "px-3 py-1 text-xs"}`}
    >
      {MAIN_APPS[m.p] && <svg viewBox="0 0 24 24" width={big ? 16 : 13} height={big ? 16 : 13} fill="currentColor" aria-hidden><path d={MAIN_APPS[m.p]} /></svg>}
      {musicLabel(m.p)}
    </a>
  );

  const musicRow = (l: ProfileLink, big = false) => {
    if (!l.music || l.locked) return null;
    const { main, rest } = splitApps(l.music.links, l.music.prefer);
    return (
      <div className="mt-2 text-center" aria-label={`Listen to ${l.title} on`}>
        <div className="flex flex-wrap justify-center gap-1.5">{main.map((m) => appLink(l, m, big))}</div>
        {rest.length > 0 && (
          <details className="mt-1.5">
            <summary className="cursor-pointer list-none text-xs font-medium underline opacity-70 [&::-webkit-details-marker]:hidden">
              + {rest.length} more {rest.length === 1 ? "app" : "apps"}
            </summary>
            <div className="mt-1.5 flex flex-wrap justify-center gap-1.5">{rest.map((m) => appLink(l, m))}</div>
          </details>
        )}
      </div>
    );
  };

  const featured = links.find((l) => l.featured && !l.locked && !l.dropsAt && !l.heading);
  const featuredBlock = featured && (() => {
    const player = featuredPlayer(featured);
    const body = (
      <div className="tint rounded-2xl p-3 [--tint:0.06]">
        <p className="mb-2 text-center text-xs font-bold uppercase tracking-widest opacity-70">⭐ New music</p>
        <p className="mb-2 text-center font-bold">{featured.title}</p>
        {player ? (
          <iframe
            src={player.src}
            title={featured.title}
            loading="lazy"
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            allowFullScreen
            className="block w-full overflow-hidden rounded-xl border-0 shadow"
            style={player.aspect ? { aspectRatio: player.aspect } : { height: player.height }}
          />
        ) : (
          <a href={preview ? featured.url : `/go/${featured.id}`} target={preview ? "_blank" : undefined} rel="noopener noreferrer nofollow" className={btnClass} style={btnStyle}>▶️ Play</a>
        )}
        {featured.music ? musicRow(featured, true) : null}
      </div>
    );
    return (
      <div className="mt-8 w-full">
        {featured.sensitive ? <SensitiveGate title={featured.title} className={btnClass} style={btnStyle}>{body}</SensitiveGate> : body}
      </div>
    );
  })();
  const listLinks = featured ? links.filter((l) => l !== featured) : links;

  const latestRow = (l: ProfileLink) => {
    const item = l.locked ? null : l.latest?.item;
    if (!item) return null;
    return (
      <a
        href={preview ? item.url : `/go/${l.id}?to=latest`}
        target={preview ? "_blank" : undefined}
        rel="noopener noreferrer nofollow"
        className="tint mt-2 flex items-center gap-2 rounded-xl px-3 py-2 text-left text-sm [--tint:0.08]"
      >
        <span className="shrink-0 rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
          {LATEST_LABEL[l.latest!.kind].badge}
        </span>
        <span className="min-w-0 truncate font-medium">{item.title}</span>
      </a>
    );
  };

  return (
    <div className={`flex min-h-full flex-col items-center px-5 py-12 ${theme.page}`} style={{ ...pageStyle(style), ...backgroundImageStyle(bgUrl, style) }}>
      <ChaosMode active={Boolean(style.chaos)} />
      <div className="flex w-full max-w-md flex-1 flex-col items-center">
        {avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatar} alt="" className="h-24 w-24 rounded-full object-cover shadow-lg" />
        ) : (
          <div className="flex h-24 w-24 items-center justify-center rounded-full tint [--tint:0.15] text-4xl font-black uppercase">
            {name.slice(0, 1)}
          </div>
        )}
        <h1 className="mt-4 text-xl font-bold">{name}</h1>
        <p className={`text-sm ${theme.muted}`} style={mutedStyle}>
          @{user.handle}
        </p>
        {user.bio && <p className="mt-3 whitespace-pre-line text-center">{user.bio}</p>}

        {socials.length > 0 && (
          <ul className="mt-5 flex flex-wrap justify-center gap-4">
            {socials.map((p) => (
              <li key={p.id}>
                <a
                  href={user.socials[p.id]}
                  target={preview ? "_blank" : undefined}
                  rel="noopener noreferrer me"
                  aria-label={p.label}
                  title={p.label}
                  className="block opacity-80 transition hover:scale-110 hover:opacity-100"
                >
                  <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor" aria-hidden><path d={platform(p.id)!.path} /></svg>
                </a>
              </li>
            ))}
          </ul>
        )}

        {tips.length > 0 && (
          <details className="group mt-5 w-full">
            <summary className={`${btnClass} cursor-pointer list-none [&::-webkit-details-marker]:hidden`} style={btnStyle}>
              💸 Tip jar
            </summary>
            <ul className="mt-2 grid grid-cols-2 gap-2">
              {tips.map((p) => (
                <li key={p.id}>
                  <a
                    href={user.tips[p.id]}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    className="block rounded-lg tint px-3 py-2.5 text-center text-sm font-semibold hover:[--tint:0.2]"
                  >
                    <span aria-hidden>{p.emoji}</span> {p.label}
                  </a>
                </li>
              ))}
            </ul>
          </details>
        )}

        {featuredBlock}

        <ul className={`${featured ? "mt-5" : "mt-8"} w-full space-y-3`}>
          {listLinks.map((l) => {
            const embed = l.embed && !l.locked ? embedFor(l.url) : null;
            if (embed) {
              const frame = (
                <iframe
                  src={embed.src}
                  title={l.title}
                  loading="lazy"
                  allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                  allowFullScreen
                  className="mx-auto block w-full overflow-hidden rounded-xl border-0 shadow"
                  style={{ ...(embed.aspect ? { aspectRatio: embed.aspect } : { height: embed.height }), maxWidth: embed.maxWidth }}
                />
              );
              return (
                <li key={l.id}>
                  {l.sensitive ? <SensitiveGate title={l.title} className={btnClass} style={btnStyle}>{frame}</SensitiveGate> : frame}
                  {musicRow(l)}
                </li>
              );
            }
            if (l.dropsAt) {
              return (
                <li key={l.id}>
                  <Countdown title={l.title} icon={l.icon} dropsAt={new Date(l.dropsAt).toISOString()} className={`${btnClass} relative cursor-default opacity-90`} style={btnStyle} />
                </li>
              );
            }
            if (l.heading) {
              return (
                <li key={l.id} className="pt-3">
                  <h2 className={`text-center text-sm font-bold uppercase tracking-widest ${theme.muted}`} style={mutedStyle}>{l.title}</h2>
                </li>
              );
            }
            const brand = l.icon ? null : iconForUrl(l.url);
            const anchor = (
              <a
                href={preview ? l.url : `/go/${l.id}`}
                target={preview ? "_blank" : undefined}
                rel={`noopener noreferrer nofollow${l.offerId ? " sponsored" : ""}`}
                className={`${btnClass} relative ${l.spotlight ? "spotlight" : ""}`}
                style={btnStyle}
              >
                {l.thumbVersion > 0 ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={`/thumb/${l.id}?v=${l.thumbVersion}`} alt="" className="absolute left-1.5 top-1/2 h-11 w-11 -translate-y-1/2 rounded-lg object-cover" />
                ) : (l.icon || brand) && (
                  <span aria-hidden className="absolute left-4 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center text-xl leading-none">
                    {l.icon ? l.icon : <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d={brand!} /></svg>}
                  </span>
                )}
                <span className={l.price ? "block px-16" : l.thumbVersion > 0 ? "px-11" : l.icon || brand || l.locked ? "px-6" : undefined}>{l.title}</span>
                {l.price && (
                  <span className={`absolute top-1/2 -translate-y-1/2 ${l.locked ? "right-10" : "right-2.5"}`}>
                    <span className="tint block max-w-[4.5rem] truncate rounded-full px-2 py-0.5 text-xs font-bold [--tint:0.12]">{l.price}</span>
                  </span>
                )}
                {l.locked && <span aria-label="Needs a code" className="absolute right-4 top-1/2 -translate-y-1/2 text-base leading-none">🔒</span>}
              </a>
            );
            return (
              <li key={l.id}>
                {(() => {
                  const gated = l.sensitive ? <SensitiveGate title={l.title} className={btnClass} style={btnStyle}>{anchor}</SensitiveGate> : anchor;
                  // A locked link keeps its code behind the lock too
                  const code = l.locked ? null : l.discountCode;
                  return code ? <DiscountLink code={code} href={preview ? l.url : `/go/${l.id}`} newTab={preview} mutedClass={theme.muted} mutedStyle={mutedStyle}>{gated}</DiscountLink> : gated;
                })()}
                {musicRow(l)}
                {latestRow(l)}
                {l.offerId && (
                  <p className={`mt-1 text-center text-[11px] ${theme.muted}`} style={mutedStyle}>
                    Affiliate link · I may earn a commission if you buy or sign up
                  </p>
                )}
              </li>
            );
          })}
          {listLinks.length === 0 && !featured && <li className={`text-center text-sm ${theme.muted}`} style={mutedStyle}>Nothing here yet. Check back soon.</li>}
        </ul>

        {user.qaEnabled && (
          <div className="mt-6 w-full">
            <AskBox userId={user.id} prompt={user.qaPrompt} buttonClass={btnClass} buttonStyle={btnStyle} preview={preview} />
            {qa.length > 0 && (
              <div className="tint mt-3 rounded-xl [--tint:0.05]">
              <ul className="max-h-[28rem] space-y-3 overflow-y-auto p-3" aria-label="Questions and answers">
                {qa.map((x) => (
                  <li key={x.id} className="space-y-1.5">
                    <p className="w-fit max-w-[85%] whitespace-pre-wrap break-words rounded-2xl rounded-bl-sm tint px-3 py-2 text-sm">
                      <span className={`block text-[11px] font-semibold ${theme.muted}`} style={mutedStyle}>🕵️ Anonymous</span>
                      {x.body}
                    </p>
                    <p className={`ml-auto w-fit max-w-[85%] whitespace-pre-wrap break-words rounded-2xl rounded-br-sm px-3 py-2 text-sm ${btnClass}`} style={btnStyle}>
                      {x.answer}
                    </p>
                  </li>
                ))}
              </ul>
              </div>
            )}
          </div>
        )}
        {user.contactEnabled && (
          <div className="mt-6 w-full">
            <ContactBox userId={user.id} buttonClass={btnClass} buttonStyle={btnStyle} preview={preview} />
          </div>
        )}
        {user.signupEnabled && (
          <div className="mt-6 w-full">
            <SignupBox userId={user.id} prompt={user.signupPrompt} buttonClass={theme.button} buttonStyle={btnStyle} preview={preview} />
          </div>
        )}
      </div>
      <NextLink href="/" className={`mt-12 font-mono text-xs ${theme.muted} hover:underline`} style={mutedStyle}>
        made with linksh.it
      </NextLink>
    </div>
  );
}

/** Links that should be visible right now (respects scheduling). */
/** Marketplace offers always sit at the very bottom of a page. */
export function offersLast<T extends { offerId: number | null }>(rows: T[]): T[] {
  return [...rows.filter((l) => !l.offerId), ...rows.filter((l) => l.offerId)];
}

/**
 * Live links, plus not-yet-live links that asked for a countdown. Those come back with
 * dropsAt set and no URL, so the destination stays secret until it goes live.
 */
export function visibleLinks<T extends Pick<LinkRow, "startsAt" | "endsAt" | "countdown" | "url">>(rows: T[], now = new Date()) {
  return rows
    .filter((l) => (!l.endsAt || l.endsAt > now) && (!l.startsAt || l.startsAt <= now || l.countdown))
    .map((l) => (l.startsAt && l.startsAt > now ? { ...l, url: "", dropsAt: l.startsAt } : { ...l, dropsAt: null }));
}

export function liveLinks<T extends Pick<LinkRow, "startsAt" | "endsAt">>(rows: T[], now = new Date()): T[] {
  return rows.filter((l) => (!l.startsAt || l.startsAt <= now) && (!l.endsAt || l.endsAt > now));
}
