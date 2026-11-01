import NextLink from "next/link";
import type { Link as LinkRow, Socials, Style, User } from "@/db";
import { embedFor } from "@/lib/embeds";
import { platform, PLATFORMS } from "@/lib/socials";
import { backgroundImageStyle, buttonStyle, pageStyle } from "@/lib/style";
import { getTheme } from "@/lib/themes";

export type ProfileData = Pick<User, "id" | "handle" | "displayName" | "bio" | "theme" | "avatarVersion" | "bgVersion"> & {
  style: Style;
  socials: Socials;
};

export function avatarUrl(u: Pick<User, "id" | "avatarVersion">) {
  return u.avatarVersion > 0 ? `/avatar/${u.id}?v=${u.avatarVersion}` : null;
}

export function backgroundUrl(u: Pick<User, "id" | "bgVersion">) {
  return u.bgVersion > 0 ? `/bg/${u.id}?v=${u.bgVersion}` : null;
}

export function ProfileView({ user, links, preview = false, avatarOverride }: {
  user: ProfileData;
  links: Pick<LinkRow, "id" | "title" | "url" | "embed">[];
  preview?: boolean;
  avatarOverride?: string | null;
}) {
  const theme = getTheme(user.theme);
  const name = user.displayName || user.handle;
  const avatar = avatarOverride !== undefined ? avatarOverride : avatarUrl(user);
  const socials = PLATFORMS.filter((p) => user.socials[p.id]);
  const bgUrl = backgroundUrl(user);
  // With a tinted background photo, flip text to match the tint unless the user picked a text colour.
  const tintText = bgUrl && user.style.bgTint ? (user.style.bgTint === "dark" ? "#ffffff" : "#1c1917") : undefined;
  const style = { ...user.style, text: user.style.text ?? tintText };
  const btnStyle = buttonStyle(style);
  const mutedStyle = style.text ? { color: style.text, opacity: 0.7 } : undefined;

  return (
    <div className={`flex min-h-full flex-col items-center px-5 py-12 ${theme.page}`} style={{ ...pageStyle(style), ...backgroundImageStyle(bgUrl, style) }}>
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

        <ul className="mt-8 w-full space-y-3">
          {links.map((l) => {
            const embed = l.embed ? embedFor(l.url) : null;
            if (embed) {
              return (
                <li key={l.id} className="overflow-hidden rounded-xl shadow">
                  <iframe
                    src={embed.src}
                    title={l.title}
                    loading="lazy"
                    allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                    allowFullScreen
                    className="block w-full border-0"
                    style={embed.aspect ? { aspectRatio: embed.aspect } : { height: embed.height }}
                  />
                </li>
              );
            }
            return (
              <li key={l.id}>
                <a
                  href={preview ? l.url : `/go/${l.id}`}
                  target={preview ? "_blank" : undefined}
                  rel="noopener noreferrer nofollow"
                  className={`block rounded-xl px-5 py-4 text-center font-semibold transition hover:-translate-y-0.5 ${theme.button}`}
                  style={btnStyle}
                >
                  {l.title}
                </a>
              </li>
            );
          })}
          {links.length === 0 && <li className={`text-center text-sm ${theme.muted}`} style={mutedStyle}>Nothing here yet. Check back soon.</li>}
        </ul>
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
