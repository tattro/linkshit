import "server-only";
import { headers } from "next/headers";
import { deviceKind } from "@/lib/tracking";

export async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get("x-real-ip") ?? h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

export async function siteUrl(): Promise<string> {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

const BOT_RE = /bot|crawl|spider|slurp|facebookexternalhit|embedly|preview|whatsapp|telegram|discord|curl|wget|python|headless/i;

/** Who is looking at a page, for analytics. Returns null for bots and link-preview fetchers. */
export function visitorInfo(h: Headers, ownHost?: string) {
  const ua = h.get("user-agent") ?? "";
  if (!ua || BOT_RE.test(ua) || h.get("purpose") === "prefetch" || h.get("next-router-prefetch")) return null;
  let referrer: string | null = null;
  const ref = h.get("referer");
  if (ref) {
    try {
      const host = new URL(ref).hostname.replace(/^www\./, "");
      referrer = host === ownHost?.replace(/^www\./, "") ? null : host.slice(0, 100);
    } catch {}
  }
  const country = h.get("x-vercel-ip-country")?.slice(0, 2).toUpperCase() ?? null;
  return { referrer, country, device: deviceKind(ua) };
}
