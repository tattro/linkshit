import "server-only";
import { MUSIC_PLATFORMS, type MusicLinks } from "@/lib/music";
import { normalizeUrl } from "@/lib/urls";
import { safeFetch } from "@/lib/safeFetch";

// Overridable for local tests only
const API = process.env.SONGLINK_API || "https://api.song.link/v1-alpha.1/links";
const ITUNES = process.env.ITUNES_API_BASE || "https://itunes.apple.com";
const SPOTIFY = process.env.SPOTIFY_OEMBED_BASE || "https://open.spotify.com";

type Song = { title: string; artist: string };
type Found = { p: string; url: string };

/** Lowercase letters and digits only, so "Don't Stop (feat. X)" and "dont stop" compare equal. */
const norm = (s: string) => s.toLowerCase().replace(/\s*[([].*?(feat|ft|with|prod)\.?[^)\]]*[)\]]/g, "").replace(/[^\p{L}\p{N}]+/gu, "");

const decode = (s: string) =>
  s.replace(/&quot;/g, '"').replace(/&#0?39;|&#x27;|&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&").trim();

async function getJson<T>(url: string): Promise<T | null> {
  const res = await safeFetch(url, { maxBytes: 1_000_000, accept: "application/json" });
  if (!res) return null;
  try { return JSON.parse(res.body.toString("utf8")) as T; } catch { return null; }
}

/** Odesli (song.link): every app at once. It can be slow for songs it hasn't seen yet, and rate limits, so one retry. */
async function odesli(url: string) {
  type Data = { entityUniqueId?: string; entitiesByUniqueId?: Record<string, { title?: unknown; artistName?: unknown }>; linksByPlatform?: Record<string, { url?: unknown }> };
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(`${API}?url=${encodeURIComponent(url)}&userCountry=US&songIfSingle=true`, { signal: AbortSignal.timeout(9000) });
      if (res.ok) return (await res.json()) as Data;
      if (res.status !== 429 && res.status < 500) return null;
    } catch { /* timeout or network: try once more */ }
    if (attempt === 0) await new Promise((r) => setTimeout(r, 1500));
  }
  return null;
}

/** Song and artist name from a Spotify page, for when Odesli doesn't know the song. */
async function spotifySong(url: string): Promise<Song | null> {
  const m = url.match(/open\.spotify\.com\/(?:intl-\w+\/)?(track|album)\/(\w+)/);
  if (!m) return null;
  const page = await safeFetch(`${SPOTIFY}/${m[1]}/${m[2]}`, { maxBytes: 400_000, accept: "text/html", truncate: true });
  const html = page?.body.toString("utf8") ?? "";
  const title = html.match(/<meta property="og:title" content="([^"]+)"/)?.[1];
  // og:description reads "Artist · Album · Song · 2024" (or "Artist · Album · 2024")
  const artist = html.match(/<meta property="og:description" content="([^"·]+?)\s*·/)?.[1]
    ?? html.match(/<meta name="music:musician_description" content="([^"]+)"/)?.[1];
  return title && artist ? { title: decode(title), artist: decode(artist) } : null;
}

/** Apple Music link through the free iTunes search, only on an exact artist and song match. */
async function appleFor(song: Song): Promise<string | null> {
  type R = { results?: { artistName?: string; trackName?: string; collectionName?: string; trackViewUrl?: string; collectionViewUrl?: string }[] };
  const data = await getJson<R>(`${ITUNES}/search?term=${encodeURIComponent(`${song.artist} ${song.title}`)}&entity=song&limit=15&country=US`);
  const hit = data?.results?.find((r) => norm(r.artistName ?? "").includes(norm(song.artist)) && norm(r.trackName ?? "") === norm(song.title));
  const raw = hit?.trackViewUrl;
  if (!raw) return null;
  const u = normalizeUrl(raw.replace(/[?&]uo=\d+/, ""));
  return u && /^https:\/\/music\.apple\.com\//.test(u) ? u : null;
}

/** No guessing at videos (re-uploads are everywhere): a YouTube Music search for the song instead. */
function youtubeMusicSearch(song: Song): string {
  return `https://music.youtube.com/search?q=${encodeURIComponent(`${song.artist} ${song.title}`)}`;
}

/**
 * Looks a song or album up on every music app. Odesli first; Apple Music is then
 * filled in by our own search, and YouTube Music by a search link, if Odesli missed them.
 * Null if nothing beyond the original link was found (the link still saves).
 */
export async function lookupMusic(url: string): Promise<MusicLinks | null> {
  try {
    const data = await odesli(url);
    const found: Found[] = MUSIC_PLATFORMS.flatMap(({ id }) => {
      const raw = data?.linksByPlatform?.[id]?.url;
      const clean = typeof raw === "string" ? normalizeUrl(raw) : null;
      return clean && clean.startsWith("https://") ? [{ p: id, url: clean }] : [];
    });
    const has = (p: string) => found.some((f) => f.p === p);
    if (!has("spotify") && /open\.spotify\.com\//.test(url)) found.push({ p: "spotify", url });
    if (!has("appleMusic") && /music\.apple\.com\//.test(url)) found.push({ p: "appleMusic", url });

    if (!has("appleMusic") || !(has("youtube") || has("youtubeMusic"))) {
      const entity = data?.entityUniqueId ? data.entitiesByUniqueId?.[data.entityUniqueId] : undefined;
      const song: Song | null = typeof entity?.title === "string" && typeof entity.artistName === "string"
        ? { title: entity.title, artist: entity.artistName }
        : await spotifySong(url);
      if (song) {
        const [apple, yt] = await Promise.all([
          has("appleMusic") ? null : appleFor(song).catch(() => null),
          has("youtube") || has("youtubeMusic") ? null : youtubeMusicSearch(song),
        ]);
        if (apple) found.push({ p: "appleMusic", url: apple });
        if (yt) found.push({ p: "youtubeMusic", url: yt });
      }
    }
    const order = MUSIC_PLATFORMS.map((p) => p.id);
    found.sort((a, b) => order.indexOf(a.p) - order.indexOf(b.p));
    return found.length >= 2 ? { links: found } : null;
  } catch {
    return null;
  }
}
