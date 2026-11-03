/**
 * "Listen on…" buttons: one song or album link becomes buttons for every
 * music app, found through the free Odesli (song.link) API when the link is saved.
 * This file is safe for the browser; the network call lives in musicLookup.ts.
 */
export type MusicLinks = { links: { p: string; url: string }[]; prefer?: PlayerApp };

/** Which app plays the featured song and gets the first button. */
// "youtube" means YouTube Music (the id is kept so older pages keep their choice)
export type PlayerApp = "spotify" | "appleMusic" | "youtube";
export const PLAYER_APPS: { id: PlayerApp; label: string }[] = [
  { id: "spotify", label: "Spotify" },
  { id: "appleMusic", label: "Apple Music" },
  { id: "youtube", label: "YouTube Music" },
];
export const DEFAULT_PLAYER: PlayerApp = "spotify";

/** The app a pasted song link is from: it plays the song and gets the first button. */
export function sourceApp(url: string): PlayerApp | undefined {
  if (/^https?:\/\/open\.spotify\.com\//i.test(url)) return "spotify";
  if (/^https?:\/\/music\.apple\.com\//i.test(url)) return "appleMusic";
  if (/^https?:\/\/(music\.|www\.)?youtube\.com\//i.test(url)) return "youtube";
  return undefined;
}

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
