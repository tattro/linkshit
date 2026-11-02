import "server-only";
import { and, eq, isNotNull, isNull, sql } from "drizzle-orm";
import { db, links } from "@/db";
import { latestKind, type LatestFeed } from "@/lib/feeds";
import { safeFetch } from "@/lib/safeFetch";
import { normalizeUrl } from "@/lib/urls";
import { lookupMusic } from "@/lib/musicLookup";

// Overridable for local tests only
const YOUTUBE = process.env.YOUTUBE_FEED_BASE || "https://www.youtube.com";
const ITUNES = process.env.ITUNES_API_BASE || "https://itunes.apple.com";
const SPOTIFY_OEMBED = process.env.SPOTIFY_OEMBED_BASE || "https://open.spotify.com";

async function getJson<T>(url: string): Promise<T | null> {
  const res = await safeFetch(url, { maxBytes: 500_000, accept: "application/json" });
  if (!res) return null;
  try { return JSON.parse(res.body.toString("utf8")) as T; } catch { return null; }
}

const decode = (s: string) =>
  s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#0?39;|&apos;/g, "'").replace(/&amp;/g, "&")
    .trim();

/** The feed URL behind a YouTube channel, Apple Podcasts show or RSS link. */
async function findFeed(url: string): Promise<string | null> {
  const kind = latestKind(url);
  if (kind === "youtube") {
    const id = url.match(/\/channel\/(UC[\w-]{22})/)?.[1] ?? (await channelIdFromPage(url));
    return id ? `${YOUTUBE}/feeds/videos.xml?channel_id=${id}` : null;
  }
  if (kind === "podcast") {
    const appleId = /podcasts\.apple\.com/i.test(url) ? url.match(/\/id(\d+)/)?.[1] : null;
    if (!appleId) return url;
    const data = await getJson<{ results?: { feedUrl?: unknown }[] }>(`${ITUNES}/lookup?id=${appleId}&entity=podcast`);
    const feed = data?.results?.[0]?.feedUrl;
    return typeof feed === "string" ? normalizeUrl(feed) : null;
  }
  if (kind === "release") {
    const id = await appleArtistId(url);
    return id ? `itunes:${id}` : null;
  }
  return null;
}

/**
 * Apple's artist id: straight from an Apple Music link, or for a Spotify artist,
 * their name (from Spotify's public oEmbed, no key) looked up on Apple.
 */
async function appleArtistId(url: string): Promise<string | null> {
  const direct = /music\.apple\.com/i.test(url) ? url.match(/\/artist\/(?:[^/]+\/)?(\d+)/)?.[1] : null;
  if (direct) return direct;
  const embed = await getJson<{ title?: unknown }>(`${SPOTIFY_OEMBED}/oembed?url=${encodeURIComponent(url)}`);
  const name = typeof embed?.title === "string" ? embed.title.trim() : "";
  if (!name) return null;
  const found = await getJson<{ results?: { artistId?: unknown; artistName?: unknown }[] }>(
    `${ITUNES}/search?term=${encodeURIComponent(name)}&entity=musicArtist&limit=5`,
  );
  // Only trust an exact name match, so we don't follow a different artist
  const hit = found?.results?.find((r) => typeof r.artistName === "string" && r.artistName.toLowerCase() === name.toLowerCase());
  return hit && typeof hit.artistId === "number" ? String(hit.artistId) : null;
}

type AppleAlbum = { wrapperType?: string; collectionName?: string; collectionViewUrl?: string; releaseDate?: string };

/** The artist's newest album or single on Apple, linked on the same app the musician's link points to. */
async function newestRelease(feed: string, linkUrl: string): Promise<{ title: string; url: string } | null> {
  const id = feed.slice("itunes:".length);
  if (!/^\d+$/.test(id)) return null;
  const data = await getJson<{ results?: AppleAlbum[] }>(`${ITUNES}/lookup?id=${id}&entity=album&sort=recent&limit=20`);
  const albums = (data?.results ?? []).filter((r) => r.wrapperType === "collection" && r.collectionName && r.collectionViewUrl && r.releaseDate);
  // Today's or past releases only (pre-orders have a future date)
  const now = Date.now();
  const newest = albums
    .filter((a) => Date.parse(a.releaseDate!) <= now)
    .sort((a, b) => Date.parse(b.releaseDate!) - Date.parse(a.releaseDate!))[0];
  if (!newest) return null;
  const appleUrl = normalizeUrl(newest.collectionViewUrl!.replace(/[?&]uo=\d+/, ""));
  if (!appleUrl) return null;
  const title = newest.collectionName!.replace(/ - (Single|EP)$/i, "").slice(0, 120);
  // A Spotify musician wants fans to land on Spotify
  if (/open\.spotify\.com/i.test(linkUrl)) {
    const music = await lookupMusic(appleUrl);
    const spotify = music?.links.find((m) => m.p === "spotify")?.url;
    if (spotify) return { title, url: spotify };
  }
  return { title, url: appleUrl };
}

async function channelIdFromPage(url: string): Promise<string | null> {
  const page = await safeFetch(url, { maxBytes: 800_000, accept: "text/html", truncate: true });
  const html = page?.body.toString("utf8") ?? "";
  return (
    html.match(/<link rel="canonical" href="https:\/\/www\.youtube\.com\/channel\/(UC[\w-]{22})"/)?.[1] ??
    html.match(/"(?:externalId|channelId)":"(UC[\w-]{22})"/)?.[1] ??
    null
  );
}

/** Newest entry of an RSS or Atom feed. */
export function newestItem(xml: string, fallbackUrl: string): { title: string; url: string } | null {
  const entry = xml.match(/<(item|entry)[\s>][\s\S]*?<\/\1>/)?.[0];
  if (!entry) return null;
  const title = decode(entry.match(/<title[^>]*>([\s\S]*?)<\/title>/)?.[1] ?? "").slice(0, 120);
  const link =
    entry.match(/<link[^>]*rel=["']alternate["'][^>]*href=["']([^"']+)["']/)?.[1] ??
    entry.match(/<link[^>]*href=["']([^"']+)["']/)?.[1] ??
    entry.match(/<link>([\s\S]*?)<\/link>/)?.[1];
  const url = (link && normalizeUrl(decode(link))) || fallbackUrl;
  return title ? { title, url } : null;
}

async function fetchNewest(feed: string, fallbackUrl: string) {
  if (feed.startsWith("itunes:")) return newestRelease(feed, fallbackUrl);
  // Only the top of the feed matters: the newest item comes first
  const res = await safeFetch(feed, { maxBytes: 400_000, accept: "application/rss+xml, application/atom+xml, text/xml", truncate: true });
  return res ? newestItem(res.body.toString("utf8"), fallbackUrl) : null;
}

/** Set up "show my newest video/episode" for a link. Null when there's no feed to follow. */
export async function setUpLatest(url: string): Promise<LatestFeed | null> {
  const kind = latestKind(url);
  if (!kind) return null;
  try {
    const feed = await findFeed(url);
    if (!feed) return null;
    return { kind, feed, item: await fetchNewest(feed, url), checkedAt: Date.now() };
  } catch {
    return null;
  }
}

/** Re-checks a feed. Keeps the old item if the feed is having a bad day. */
export async function refreshLatest(latest: LatestFeed, linkUrl: string): Promise<LatestFeed> {
  try {
    const item = await fetchNewest(latest.feed, linkUrl);
    return { ...latest, item: item ?? latest.item, checkedAt: Date.now() };
  } catch {
    return { ...latest, checkedAt: Date.now() };
  }
}

const STALE_MS = 3 * 60 * 60 * 1000;

/** Re-checks a page's "newest video/episode" feeds that are a few hours old. Runs after a page view. */
export async function refreshStaleLatest(userId: number) {
  const cutoff = Date.now() - STALE_MS;
  const rows = await db.select({ id: links.id, url: links.url, latest: links.latest }).from(links)
    .where(and(eq(links.userId, userId), isNull(links.deletedAt), isNotNull(links.latest), sql`(${links.latest}->>'checkedAt')::bigint < ${cutoff}`))
    .limit(5);
  for (const r of rows) {
    // Claim it first, so a burst of visitors triggers one fetch, not fifty
    const claimed = await db.update(links)
      .set({ latest: sql`jsonb_set(${links.latest}, '{checkedAt}', to_jsonb(${Date.now()}::bigint))` })
      .where(and(eq(links.id, r.id), sql`(${links.latest}->>'checkedAt')::bigint = ${r.latest!.checkedAt}`))
      .returning({ id: links.id });
    if (!claimed.length) continue;
    const fresh = await refreshLatest(r.latest!, r.url);
    // Unless the link was edited meanwhile
    await db.update(links).set({ latest: fresh })
      .where(and(eq(links.id, r.id), sql`${links.latest}->>'feed' = ${r.latest!.feed}`));
  }
}
