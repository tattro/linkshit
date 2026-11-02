/**
 * "Listen on…" buttons: one song or album link becomes buttons for every
 * music app, found through the free Odesli (song.link) API when the link is saved.
 * This file is safe for the browser; the network call lives in musicLookup.ts.
 */
export type MusicLinks = { links: { p: string; url: string }[] };

// Order on the page, and how each Odesli platform key is labelled
export const MUSIC_PLATFORMS: { id: string; label: string }[] = [
  { id: "spotify", label: "Spotify" },
  { id: "appleMusic", label: "Apple Music" },
  { id: "youtubeMusic", label: "YouTube Music" },
  { id: "youtube", label: "YouTube" },
  { id: "amazonMusic", label: "Amazon Music" },
  { id: "tidal", label: "Tidal" },
  { id: "deezer", label: "Deezer" },
  { id: "soundcloud", label: "SoundCloud" },
  { id: "pandora", label: "Pandora" },
];

export const musicLabel = (id: string) => MUSIC_PLATFORMS.find((p) => p.id === id)?.label ?? id;

/** Song, album or EP pages on the big music apps (not artist pages or playlists). */
export function isMusicUrl(raw: string): boolean {
  let u: URL;
  try { u = new URL(/^https?:\/\//i.test(raw.trim()) ? raw.trim() : `https://${raw.trim()}`); } catch { return false; }
  const host = u.hostname.toLowerCase().replace(/^www\./, "");
  const path = u.pathname;
  if (host === "open.spotify.com") return /^\/(?:intl-\w+\/)?(track|album)\//.test(path);
  if (host === "music.apple.com") return /\/(album|song)\//.test(path);
  if (host === "music.youtube.com") return path === "/watch" || path === "/playlist";
  if (host === "tidal.com" || host === "listen.tidal.com") return /\/(track|album)\//.test(path);
  if (host === "deezer.com") return /\/(track|album)\//.test(path);
  if (host === "music.amazon.com") return /\/(albums|tracks)\//.test(path);
  return false;
}
