// Validates the tracking IDs people paste in, so nothing else ends up in a script tag.

export function cleanMetaPixel(raw: string): string | null {
  const v = raw.trim();
  if (!v) return "";
  return /^\d{6,20}$/.test(v) ? v : null;
}

export function cleanGoogleAnalytics(raw: string): string | null {
  const v = raw.trim().toUpperCase();
  if (!v) return "";
  return /^G-[A-Z0-9]{4,15}$/.test(v) ? v : null;
}

export function cleanTiktokPixel(raw: string): string | null {
  const v = raw.trim().toUpperCase();
  if (!v) return "";
  return /^[A-Z0-9]{10,30}$/.test(v) ? v : null;
}

/** Adds utm_source/medium/campaign unless the link already has its own. */
export function withUtm(url: string, handle: string): string {
  try {
    const u = new URL(url);
    if (!/^https?:$/.test(u.protocol) || u.searchParams.has("utm_source")) return url;
    u.searchParams.set("utm_source", "linksh.it");
    u.searchParams.set("utm_medium", "social");
    u.searchParams.set("utm_campaign", handle);
    return u.toString();
  } catch {
    return url;
  }
}

export type DeviceKind = "mobile" | "tablet" | "desktop";

export function deviceKind(ua: string): DeviceKind {
  if (/iPad|Tablet|Android(?!.*Mobile)/i.test(ua)) return "tablet";
  if (/Mobi|iPhone|iPod|Android/i.test(ua)) return "mobile";
  return "desktop";
}
