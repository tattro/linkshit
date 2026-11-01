import NextLink from "next/link";
import type { Link as LinkRow, Socials, Style, Tips, User } from "@/db";
import { embedFor } from "@/lib/embeds";
import { iconForUrl, platform, PLATFORMS } from "@/lib/socials";
import { TIP_PROVIDERS } from "@/lib/tips";
import { SensitiveGate } from "./SensitiveGate";
import { SignupBox } from "./SignupBox";
import { ChaosMode } from "./ChaosMode";
import { backgroundImageStyle, buttonStyle, pageStyle } from "@/lib/style";
import { getTheme } from "@/lib/themes";

export type ProfileData = Pick<User, "id" | "handle" | "displayName" | "bio" | "theme" | "avatarVersion" | "bgVersion" | "signupEnabled" | "signupPrompt"> & {
  style: Style;
  socials: Socials;
  tips: Tips;
};

export type ProfileLink = Pick<LinkRow, "id" | "title" | "url" | "embed" | "sensitive" | "spotlight" | "icon">;

export function avatarUrl(u: Pick<User, "id" | "avatarVersion">) {
  return u.avatarVersion > 0 ? `/avatar/${u.id}?v=${u.avatarVersion}` : null;
}

export function backgroundUrl(u: Pick<User, "id" | "bgVersion">) {
  return u.bgVersion > 0 ? `/bg/${u.id}?v=${u.bgVersion}` : null;
}

export function ProfileView({ user, links, preview = false, avatarOverride }: {
  user: ProfileData;
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

  return (
    <div className={`flex min-h-full flex-col items-center px-5 py-12 ${theme.page}`} style={{ ...pageStyle(style), ...backgroundImageStyle(bgUrl, style) }}>
      <ChaosMode active={Boolean(style.chaos)} />
      <div className="flex w-full max-w-md flex-1 flex-col items-center">
        {avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatar} alt="" className="h-24 w-24 rounded-full object-cover shadow-lg" />
        ) : (
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-current/15 text-4xl font-black uppercase">
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
                    className="block rounded-lg bg-current/10 px-3 py-2.5 text-center text-sm font-semibold transition hover:bg-current/20"
                  >
                    <span aria-hidden>{p.emoji}</span> {p.label}
                  </a>
                </li>
              ))}
            </ul>
          </details>
        )}

        <ul className="mt-8 w-full space-y-3">
          {links.map((l) => {
            const embed = l.embed ? embedFor(l.url) : null;
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
                </li>
              );
            }
            const brand = l.icon ? null : iconForUrl(l.url);
            const anchor = (
              <a
                href={preview ? l.url : `/go/${l.id}`}
                target={preview ? "_blank" : undefined}
                rel="noopener noreferrer nofollow"
                className={`${btnClass} relative ${l.spotlight ? "spotlight" : ""}`}
                style={btnStyle}
              >
                {(l.icon || brand) && (
                  <span aria-hidden className="absolute left-4 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center text-xl leading-none">
                    {l.icon ? l.icon : <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d={brand!} /></svg>}
                  </span>
                )}
                <span className={l.icon || brand ? "px-6" : undefined}>{l.title}</span>
              </a>
            );
            return (
              <li key={l.id}>
                {l.sensitive ? <SensitiveGate title={l.title} className={btnClass} style={btnStyle}>{anchor}</SensitiveGate> : anchor}
              </li>
            );
          })}
          {links.length === 0 && <li className={`text-center text-sm ${theme.muted}`} style={mutedStyle}>Nothing here yet. Check back soon.</li>}
        </ul>

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
export function liveLinks<T extends Pick<LinkRow, "startsAt" | "endsAt">>(rows: T[], now = new Date()): T[] {
  return rows.filter((l) => (!l.startsAt || l.startsAt <= now) && (!l.endsAt || l.endsAt > now));
}
