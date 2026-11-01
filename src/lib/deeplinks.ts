export type Device = { os: "ios" | "android" | "other"; inApp: boolean };

export function detectDevice(ua: string): Device {
  const os = /iPhone|iPad|iPod/i.test(ua) ? "ios" : /Android/i.test(ua) ? "android" : "other";
  // In-app browsers of social apps, where links get trapped instead of opening the real app
  const inApp = /Instagram|FBAN|FBAV|FB_IAB|musical_ly|Bytedance|TikTok|Snapchat|Twitter|LinkedInApp|Line\//i.test(ua);
  return { os, inApp };
}

type AppTarget = { name: string; ios: string; androidPackage: string };

/** Work out which app a web URL belongs to and how to open it there. */
export function appTarget(raw: string): AppTarget | null {
  let u: URL;
  try { u = new URL(raw); } catch { return null; }
  const host = u.hostname.replace(/^(www|m)\./, "");
  const path = u.pathname.replace(/\/$/, "");

  if (host === "youtube.com" || host === "youtu.be") {
    return { name: "YouTube", ios: `youtube://${u.host}${u.pathname}${u.search}`, androidPackage: "com.google.android.youtube" };
  }
  if (host === "open.spotify.com") {
    const m = path.match(/^\/(?:intl-\w+\/)?(track|album|playlist|artist|episode|show|user)\/([\w.-]+)/);
    if (m) return { name: "Spotify", ios: `spotify:${m[1]}:${m[2]}`, androidPackage: "com.spotify.music" };
  }
  if (host === "instagram.com") {
    const user = path.match(/^\/([\w.]{1,30})$/)?.[1];
    const media = path.match(/^\/(?:p|reel)\/([\w-]+)/)?.[1];
    if (user || media) {
      return {
        name: "Instagram",
        ios: user ? `instagram://user?username=${user}` : `instagram://media?id=${media}`,
        androidPackage: "com.instagram.android",
      };
    }
  }
  if (host === "x.com" || host === "twitter.com") {
    const user = path.match(/^\/(\w{1,15})$/)?.[1];
    const status = path.match(/^\/\w+\/status\/(\d+)/)?.[1];
    if (user || status) {
      return {
        name: "X",
        ios: user ? `twitter://user?screen_name=${user}` : `twitter://status?id=${status}`,
        androidPackage: "com.twitter.android",
      };
    }
  }
  return null;
}

/** Android intent URL: opens the app if installed, otherwise falls back to the web URL. */
export function androidIntent(raw: string, pkg: string) {
  const u = new URL(raw);
  return `intent://${u.host}${u.pathname}${u.search}#Intent;scheme=https;package=${pkg};S.browser_fallback_url=${encodeURIComponent(raw)};end`;
}
