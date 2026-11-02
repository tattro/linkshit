import "server-only";
import { MUSIC_PLATFORMS, type MusicLinks } from "@/lib/music";
import { normalizeUrl } from "@/lib/urls";

const API = process.env.SONGLINK_API || "https://api.song.link/v1-alpha.1/links";

/** Looks a song or album up on every music app. Null if it can't (the link still saves). */
export async function lookupMusic(url: string): Promise<MusicLinks | null> {
  try {
    const res = await fetch(`${API}?url=${encodeURIComponent(url)}&userCountry=US`, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    const data = (await res.json()) as { linksByPlatform?: Record<string, { url?: unknown }> };
    const found = MUSIC_PLATFORMS.flatMap(({ id }) => {
      const raw = data.linksByPlatform?.[id]?.url;
      const clean = typeof raw === "string" ? normalizeUrl(raw) : null;
      return clean && clean.startsWith("https://") ? [{ p: id, url: clean }] : [];
    });
    return found.length >= 2 ? { links: found } : null;
  } catch {
    return null;
  }
}
