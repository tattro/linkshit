// Pulls the public links off someone's Linktree page so they can switch in one go.
// Linktree is a Next.js site: everything we need is in the page's __NEXT_DATA__ JSON.

export type ImportedLink = { title: string; url: string };
export type LinktreeProfile = { name: string; bio: string; links: ImportedLink[] };

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
  };
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
