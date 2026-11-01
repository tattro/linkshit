export type Embed = { src: string; height: number; aspect?: string };

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
  return null;
}
