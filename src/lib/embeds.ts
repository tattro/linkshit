export type Embed = { src: string; height: number; aspect?: string; maxWidth?: number };

// Twitch refuses to embed unless told which site it's on.
const SITE_HOST = (() => {
  try { return new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://linksh.it").hostname; } catch { return "linksh.it"; }
})();

/** Returns an iframe source for links we know how to embed, otherwise null. */
export function embedFor(raw: string): Embed | null {
  let u: URL;
  try { u = new URL(raw); } catch { return null; }
  const host = u.hostname.replace(/^www\.|^m\./, "");

  if (host === "youtube.com" || host === "youtu.be") {
    let id: string | null = null;
    if (host === "youtu.be") id = u.pathname.slice(1);
    else if (u.pathname === "/watch") id = u.searchParams.get("v");
    else id = u.pathname.match(/^\/(?:shorts|embed|live)\/([\w-]+)/)?.[1] ?? null;
    if (id && /^[\w-]{6,20}$/.test(id)) return { src: `https://www.youtube-nocookie.com/embed/${id}`, height: 0, aspect: "16 / 9" };
  }
  if (host === "open.spotify.com") {
    const m = u.pathname.match(/^\/(?:intl-\w+\/)?(track|album|playlist|artist|episode|show)\/(\w+)/);
    if (m) return { src: `https://open.spotify.com/embed/${m[1]}/${m[2]}`, height: m[1] === "track" || m[1] === "episode" ? 152 : 352 };
  }
  if (host === "soundcloud.com") {
    return { src: `https://w.soundcloud.com/player/?url=${encodeURIComponent(u.toString())}&color=%23000000&visual=false`, height: 166 };
  }
  if (host === "tiktok.com") {
    const id = u.pathname.match(/^\/@[\w.\-]+\/video\/(\d{5,25})/)?.[1];
    if (id) return { src: `https://www.tiktok.com/embed/v2/${id}`, height: 740, maxWidth: 340 };
  }
  if (host === "music.apple.com") {
    if (/^\/[a-z]{2}\/(album|playlist|song|station)\//.test(u.pathname)) {
      const isSong = u.pathname.includes("/song/") || u.searchParams.has("i");
      return { src: `https://embed.music.apple.com${u.pathname}${u.search}`, height: isSong ? 175 : 450 };
    }
  }
  if (host === "twitch.tv") {
    const video = u.pathname.match(/^\/videos\/(\d+)/)?.[1];
    if (video) return { src: `https://player.twitch.tv/?video=${video}&parent=${SITE_HOST}&autoplay=false`, height: 0, aspect: "16 / 9" };
    const clip = u.pathname.match(/^\/[\w]+\/clip\/([\w-]+)/)?.[1];
    if (clip) return { src: `https://clips.twitch.tv/embed?clip=${clip}&parent=${SITE_HOST}&autoplay=false`, height: 0, aspect: "16 / 9" };
    const channel = u.pathname.match(/^\/([\w]{3,25})\/?$/)?.[1];
    if (channel) return { src: `https://player.twitch.tv/?channel=${channel}&parent=${SITE_HOST}&autoplay=false`, height: 0, aspect: "16 / 9" };
  }
  if (host === "vimeo.com") {
    const id = u.pathname.match(/^\/(\d{4,12})/)?.[1];
    if (id) return { src: `https://player.vimeo.com/video/${id}`, height: 0, aspect: "16 / 9" };
  }
  if (host === "instagram.com") {
    const m = u.pathname.match(/^\/(p|reel|tv)\/([\w-]+)/);
    if (m) return { src: `https://www.instagram.com/${m[1] === "tv" ? "p" : m[1]}/${m[2]}/embed`, height: 620, maxWidth: 400 };
  }
  // Booking pages: visitors pick a time right on the page
  if (host === "calendly.com") {
    const path = u.pathname.match(/^\/[\w.\-]+(?:\/[\w.\-]+)?\/?$/)?.[0];
    if (path) return { src: `https://calendly.com${path.replace(/\/$/, "")}?embed_domain=${SITE_HOST}&embed_type=Inline&hide_gdpr_banner=1`, height: 700 };
  }
  if (host === "cal.com") {
    const path = u.pathname.match(/^\/[\w.\-]+(?:\/[\w.\-]+)?\/?$/)?.[0];
    if (path) return { src: `https://cal.com${path.replace(/\/$/, "")}/embed`, height: 700 };
  }
  return null;
}
