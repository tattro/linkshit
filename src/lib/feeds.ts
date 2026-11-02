/** Links that can show "newest video / episode / release" under them. Safe for client code. */
export type LatestKind = "youtube" | "podcast" | "release";

export type LatestFeed = {
  kind: LatestKind;
  feed: string;
  item: { title: string; url: string } | null;
  checkedAt: number;
};

function parse(raw: string): URL | null {
  const t = raw.trim();
  if (!t) return null;
  try {
    return new URL(/^https?:\/\//i.test(t) ? t : `https://${t}`);
  } catch {
    return null;
  }
}

export function latestKind(raw: string): LatestKind | null {
  const u = parse(raw);
  if (!u) return null;
  const host = u.hostname.replace(/^(www|m)\./, "").toLowerCase();
  if (host === "youtube.com" && /^\/(@[\w.-]+|channel\/UC[\w-]{22}|c\/[\w.-]+|user\/[\w.-]+)\/?(videos|featured|streams)?\/?$/i.test(u.pathname)) return "youtube";
  // A musician's artist page: we follow their newest album or single
  if (host === "open.spotify.com" && /^\/(?:intl-\w+\/)?artist\/[A-Za-z0-9]{22}\/?$/.test(u.pathname)) return "release";
  if (host === "music.apple.com" && /\/artist\/(?:[^/]+\/)?\d+\/?$/.test(u.pathname)) return "release";
  if (host === "podcasts.apple.com" && /\/id\d+/.test(u.pathname)) return "podcast";
  // A podcast's RSS feed (Buzzsprout, Anchor, Libsyn, Megaphone, Transistor…)
  if (/(^|\.)(feeds\.|feed\.|rss\.)/.test(`.${host}`) || /(\/rss|\/feed|\.rss|\.xml)\/?$/i.test(u.pathname)) return "podcast";
  return null;
}

export const LATEST_LABEL: Record<LatestKind, { badge: string; checkbox: string; emoji: string }> = {
  youtube: { badge: "New video", checkbox: "📺 Always show my newest video under this link", emoji: "📺" },
  podcast: { badge: "New episode", checkbox: "🎙️ Always show my newest episode under this link", emoji: "🎙️" },
  release: { badge: "New release", checkbox: "💿 Always show my newest release under this link", emoji: "💿" },
};
