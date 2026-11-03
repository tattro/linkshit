/**
 * "Let the link decide": what we recognise in a pasted link, and the one line we
 * show so people see what we set up for them. Safe for client code.
 */
import { isSpotifySong } from "@/lib/music";
import { isStoreUrl } from "@/lib/stores";
import { latestKind } from "@/lib/feeds";

// Paid adult platforms: links to these start with the 18+ warning ticked
const ADULT_HOSTS = ["onlyfans.com", "fansly.com", "fanvue.com", "manyvids.com", "loyalfans.com", "justfor.fans", "admireme.vip", "fancentro.com", "clips4sale.com"];

function hostOf(raw: string): string | null {
  const t = raw.trim();
  if (!t) return null;
  try { return new URL(/^https?:\/\//i.test(t) ? t : `https://${t}`).hostname.toLowerCase().replace(/^www\./, ""); } catch { return null; }
}

export function isAdultUrl(raw: string): boolean {
  const host = hostOf(raw);
  return Boolean(host && ADULT_HOSTS.some((h) => host === h || host.endsWith(`.${h}`)));
}

export const isSoundCloud = (url: string) => /^(https?:\/\/)?(www\.|m\.)?soundcloud\.com(\/|$)/i.test(url.trim());

/** One short line about what we spotted, or null for an ordinary link. */
export function spottedNote(url: string): string | null {
  const host = hostOf(url);
  if (!host) return null;
  if (isSpotifySong(url)) return "Spotted a Spotify song: adding a player plus Apple Music and YouTube Music buttons.";
  if (isAdultUrl(url)) return "Spotted an 18+ page: visitors get a warning before it opens.";
  if (isSoundCloud(url)) return "Spotted SoundCloud: it plays right on your page.";
  const feed = latestKind(url);
  if (feed === "youtube") return "Spotted a YouTube channel: your newest video shows under it.";
  if (feed === "podcast") return "Spotted a podcast: your newest episode shows under it.";
  if (feed === "release") return "Spotted an artist page: your newest release shows under it.";
  if (isStoreUrl(url)) return "Spotted a shop: grabbing the product picture and price.";
  if (host === "calendly.com" || host === "cal.com") return "Spotted a booking page: tick below to show your calendar right on the page.";
  return null;
}
