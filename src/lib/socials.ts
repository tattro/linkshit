import {
  siInstagram, siTiktok, siX, siYoutube, siTwitch, siSpotify, siGithub, siFacebook,
  siThreads, siBluesky, siDiscord, siSnapchat, siSoundcloud, siPatreon, siKofi, siTelegram, siWhatsapp,
} from "simple-icons";

export type Platform = {
  id: string;
  label: string;
  path: string; // 24x24 SVG path
  placeholder: string;
  /** Turn a username or URL into a full URL; null if it can't be used. */
  toUrl: (input: string) => string | null;
};

const handleOrUrl = (base: string, host: RegExp, prefix = "") => (input: string) => {
  const v = input.trim();
  if (!v) return null;
  if (/^https?:\/\//i.test(v) || host.test(v)) {
    try {
      const u = new URL(/^https?:\/\//i.test(v) ? v : `https://${v}`);
      return host.test(u.hostname) ? u.toString() : null;
    } catch {
      return null;
    }
  }
  const name = v.replace(/^@/, "");
  if (!/^[\w.\-]{1,60}$/.test(name)) return null;
  return `${base}${prefix}${name}`;
};

const MAIL_PATH =
  "M2 4h20a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Zm0 2v.5l10 6.25L22 6.5V6H2Zm20 2.85-10 6.25L2 8.85V18h20V8.85Z";

export const PLATFORMS: Platform[] = [
  { id: "instagram", label: "Instagram", path: siInstagram.path, placeholder: "@yourname", toUrl: handleOrUrl("https://instagram.com/", /(^|\.)instagram\.com$/i) },
  { id: "tiktok", label: "TikTok", path: siTiktok.path, placeholder: "@yourname", toUrl: handleOrUrl("https://www.tiktok.com/", /(^|\.)tiktok\.com$/i, "@") },
  { id: "x", label: "X", path: siX.path, placeholder: "@yourname", toUrl: handleOrUrl("https://x.com/", /(^|\.)(x|twitter)\.com$/i) },
  { id: "youtube", label: "YouTube", path: siYoutube.path, placeholder: "@yourchannel", toUrl: handleOrUrl("https://youtube.com/", /(^|\.)(youtube\.com|youtu\.be)$/i, "@") },
  { id: "twitch", label: "Twitch", path: siTwitch.path, placeholder: "yourname", toUrl: handleOrUrl("https://twitch.tv/", /(^|\.)twitch\.tv$/i) },
  { id: "spotify", label: "Spotify", path: siSpotify.path, placeholder: "open.spotify.com/artist/…", toUrl: handleOrUrl("https://open.spotify.com/user/", /(^|\.)spotify\.com$/i) },
  { id: "soundcloud", label: "SoundCloud", path: siSoundcloud.path, placeholder: "yourname", toUrl: handleOrUrl("https://soundcloud.com/", /(^|\.)soundcloud\.com$/i) },
  { id: "threads", label: "Threads", path: siThreads.path, placeholder: "@yourname", toUrl: handleOrUrl("https://www.threads.net/", /(^|\.)threads\.(net|com)$/i, "@") },
  { id: "bluesky", label: "Bluesky", path: siBluesky.path, placeholder: "you.bsky.social", toUrl: handleOrUrl("https://bsky.app/profile/", /(^|\.)bsky\.app$/i) },
  { id: "facebook", label: "Facebook", path: siFacebook.path, placeholder: "yourpage", toUrl: handleOrUrl("https://facebook.com/", /(^|\.)facebook\.com$/i) },
  { id: "snapchat", label: "Snapchat", path: siSnapchat.path, placeholder: "yourname", toUrl: handleOrUrl("https://snapchat.com/add/", /(^|\.)snapchat\.com$/i) },
  { id: "discord", label: "Discord", path: siDiscord.path, placeholder: "discord.gg/invite", toUrl: handleOrUrl("https://discord.gg/", /(^|\.)(discord\.gg|discord\.com)$/i) },
  { id: "telegram", label: "Telegram", path: siTelegram.path, placeholder: "t.me/yourchannel", toUrl: handleOrUrl("https://t.me/", /(^|\.)(t\.me|telegram\.me)$/i) },
  { id: "whatsapp", label: "WhatsApp", path: siWhatsapp.path, placeholder: "chat.whatsapp.com/… or wa.me/…", toUrl: handleOrUrl("https://wa.me/", /(^|\.)(wa\.me|whatsapp\.com)$/i) },
  { id: "github", label: "GitHub", path: siGithub.path, placeholder: "yourname", toUrl: handleOrUrl("https://github.com/", /(^|\.)github\.com$/i) },
  { id: "patreon", label: "Patreon", path: siPatreon.path, placeholder: "yourname", toUrl: handleOrUrl("https://patreon.com/", /(^|\.)patreon\.com$/i) },
  { id: "kofi", label: "Ko-fi", path: siKofi.path, placeholder: "yourname", toUrl: handleOrUrl("https://ko-fi.com/", /(^|\.)ko-fi\.com$/i) },
  {
    id: "email", label: "Email", path: MAIL_PATH, placeholder: "you@example.com",
    toUrl: (v) => (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) ? `mailto:${v.trim()}` : null),
  },
];

export const platform = (id: string) => PLATFORMS.find((p) => p.id === id);

const ICON_HOSTS: [RegExp, string][] = [
  [/(^|\.)instagram\.com$/i, "instagram"], [/(^|\.)tiktok\.com$/i, "tiktok"], [/(^|\.)(x|twitter)\.com$/i, "x"],
  [/(^|\.)(youtube\.com|youtu\.be)$/i, "youtube"], [/(^|\.)twitch\.tv$/i, "twitch"], [/(^|\.)spotify\.com$/i, "spotify"],
  [/(^|\.)soundcloud\.com$/i, "soundcloud"], [/(^|\.)threads\.(net|com)$/i, "threads"], [/(^|\.)bsky\.app$/i, "bluesky"],
  [/(^|\.)facebook\.com$/i, "facebook"], [/(^|\.)snapchat\.com$/i, "snapchat"], [/(^|\.)(discord\.gg|discord\.com)$/i, "discord"],
  [/(^|\.)(t\.me|telegram\.me)$/i, "telegram"], [/(^|\.)(wa\.me|whatsapp\.com)$/i, "whatsapp"],
  [/(^|\.)github\.com$/i, "github"], [/(^|\.)patreon\.com$/i, "patreon"], [/(^|\.)ko-fi\.com$/i, "kofi"],
];

/** Brand icon path for a link's destination, if we recognise the site. */
export function iconForUrl(url: string): string | null {
  if (url.startsWith("mailto:")) return MAIL_PATH;
  let host: string;
  try { host = new URL(url).hostname; } catch { return null; }
  const hit = ICON_HOSTS.find(([re]) => re.test(host));
  return hit ? platform(hit[1])?.path ?? null : null;
}
