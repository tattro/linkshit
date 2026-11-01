// Pulls the public links off someone's Linktree page so they can switch in one go.
// Linktree is a Next.js site: everything we need is in the page's __NEXT_DATA__ JSON.

export type ImportedLink = { title: string; url: string };
export type LinktreeProfile = { name: string; bio: string; links: ImportedLink[]; look: LinktreeLook | null };

/** Linktree's design, mapped onto our closest options. */
export type LinktreeLook = {
  bg?: string; bg2?: string; text?: string; button?: string; buttonText?: string;
  shape?: "rounded" | "pill" | "square" | "outline"; font?: string;
};

/** "linktr.ee/name", "https://linktr.ee/name", "@name" or "name" → "name"; null if not a Linktree username. */
export function linktreeUsername(raw: string): string | null {
  let v = raw.trim();
  const m = v.match(/^(?:https?:\/\/)?(?:www\.)?linktr\.ee\/([^/?#\s]+)/i);
  if (m) v = m[1];
  else if (/[/.:]/.test(v)) return null;
  v = v.replace(/^@/, "");
  return /^[\w.\-]{1,60}$/.test(v) ? v : null;
}

type Json = Record<string, unknown>;
const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");

/** Parses a Linktree page's HTML. Exported for testing. */
export function parseLinktreeHtml(html: string): LinktreeProfile | null {
  const m = html.match(/<script id="__NEXT_DATA__" type="application\/json"[^>]*>([\s\S]*?)<\/script>/);
  if (!m) return null;
  let data: Json;
  try { data = JSON.parse(m[1]); } catch { return null; }
  const page = ((data.props as Json)?.pageProps ?? {}) as Json;
  const account = (page.account ?? {}) as Json;
  const rawLinks = (Array.isArray(page.links) ? page.links : Array.isArray(account.links) ? account.links : []) as Json[];
  const links: ImportedLink[] = [];
  const seen = new Set<string>();
  for (const l of rawLinks) {
    const url = str(l.url);
    const title = str(l.title) || url;
    if (!/^https?:\/\//i.test(url) || seen.has(url)) continue;
    if (l.locked === true || l.archived === true) continue;
    seen.add(url);
    links.push({ title: title.slice(0, 100), url });
  }
  return {
    name: str(account.pageTitle || account.username).slice(0, 60),
    bio: str(account.description).slice(0, 160),
    links,
    look: extractLook(page),
  };
}

// ---- Design ----

function hex(v: unknown): string | undefined {
  const s = str(v).toLowerCase();
  if (/^#[0-9a-f]{6}$/.test(s)) return s;
  if (/^#[0-9a-f]{3}$/.test(s)) return `#${s[1]}${s[1]}${s[2]}${s[2]}${s[3]}${s[3]}`;
  const rgb = s.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (rgb) return `#${rgb.slice(1, 4).map((n) => Math.min(255, +n).toString(16).padStart(2, "0")).join("")}`;
  return undefined;
}

/** Darken (amount < 0) or lighten a hex colour. */
function shade(c: string, amount: number) {
  const n = parseInt(c.slice(1), 16);
  const ch = [n >> 16, (n >> 8) & 255, n & 255].map((x) => Math.round(amount < 0 ? x * (1 + amount) : x + (255 - x) * amount));
  return `#${ch.map((x) => x.toString(16).padStart(2, "0")).join("")}`;
}

const isDark = (c: string) => {
  const n = parseInt(c.slice(1), 16);
  return 0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255) < 140;
};

// Linktree font names → our fonts (lib/style.ts FONTS ids)
const FONT_MAP: [RegExp, string][] = [
  [/press start|pixel|vt323/i, "pixel"], [/marker/i, "marker"], [/pacifico|lobster|dancing|satisfy/i, "beach"],
  [/caveat|indie|handlee|shadows/i, "handwritten"], [/courier|special elite|typewriter/i, "typewriter"],
  [/mono|code|inconsolata/i, "mono"], [/bebas|anton|oswald|league gothic|impact/i, "display"],
  [/bangers/i, "comicbook"], [/comic/i, "comic"], [/orbitron|audiowide|exo/i, "scifi"], [/creepster|nosifer/i, "spooky"],
  [/cinzel|cormorant|playfair|abril/i, "royal"], [/nunito|quicksand|varela|comfortaa|fredoka/i, "rounded"],
  [/serif|merriweather|lora|garamond|georgia|libre baskerville|times/i, "serif"],
];

/** Finds Linktree's theme object wherever it sits in the page data. */
function findTheme(node: unknown, depth = 0): Json | null {
  if (!node || typeof node !== "object" || depth > 6) return null;
  const o = node as Json;
  if (o.theme && typeof o.theme === "object" && ("background" in (o.theme as Json) || "buttonStyle" in (o.theme as Json) || "typeface" in (o.theme as Json))) {
    return o.theme as Json;
  }
  if ("buttonStyle" in o && "background" in o) return o;
  for (const v of Object.values(o)) {
    const hit = findTheme(v, depth + 1);
    if (hit) return hit;
  }
  return null;
}

/** Exported for testing. */
export function extractLook(page: unknown): LinktreeLook | null {
  const theme = findTheme(page);
  if (!theme) return null;
  const bgObj = (theme.background ?? {}) as Json;
  const btn = (theme.buttonStyle ?? {}) as Json;
  const btnBg = (btn.backgroundStyle ?? {}) as Json;
  const btnText = (btn.textStyle ?? {}) as Json;
  const face = (theme.typeface ?? {}) as Json;
  const look: LinktreeLook = {};

  const bg = hex(bgObj.color);
  if (bg) {
    look.bg = bg;
    if (/gradient/i.test(str(bgObj.type)) || /gradient/i.test(str(bgObj.style))) {
      look.bg2 = hex(bgObj.gradientColor) ?? hex(bgObj.color2) ?? shade(bg, isDark(bg) ? 0.35 : -0.35);
    }
  }
  look.text = hex(face.color) ?? (bg ? (isDark(bg) ? "#ffffff" : "#1c1917") : undefined);
  look.button = hex(btnBg.color) ?? hex(btn.color);
  look.buttonText = hex(btnText.color) ?? hex(btn.textColor) ?? (look.button ? (isDark(look.button) ? "#ffffff" : "#1c1917") : undefined);

  const kind = `${str(btn.type)} ${str(btn.cornerStyle)} ${str(btn.shape)}`;
  if (/outline/i.test(kind)) look.shape = "outline";
  else if (/pill|circle|round_full|full/i.test(kind)) look.shape = "pill";
  else if (/square|hard/i.test(kind)) look.shape = "square";
  else if (kind.trim()) look.shape = "rounded";

  const family = str(face.family || face.fontFamily || face.name);
  if (family) look.font = FONT_MAP.find(([re]) => re.test(family))?.[1] ?? "sans";

  return Object.values(look).some(Boolean) ? look : null;
}

export async function fetchLinktree(username: string): Promise<LinktreeProfile | null> {
  const res = await fetch(`https://linktr.ee/${encodeURIComponent(username)}`, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; linksh.it importer; +https://linksh.it)", Accept: "text/html" },
    redirect: "follow",
    signal: AbortSignal.timeout(8000),
    cache: "no-store",
  }).catch(() => null);
  if (!res?.ok) return null;
  // Only trust pages that stayed on linktr.ee
  if (!/^https:\/\/(www\.)?linktr\.ee\//.test(res.url)) return null;
  const html = (await res.text()).slice(0, 3_000_000);
  return parseLinktreeHtml(html);
}
