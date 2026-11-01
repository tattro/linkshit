/** Normalise a user-entered URL, or return null if it isn't a safe web link. */
export function normalizeUrl(raw: string): string | null {
  // Phones like to sneak in invisible characters and stray spaces
  // ("morthvargr .com"), so tidy those up before checking
  let value = raw
    .replace(/[\u200B-\u200D\u2060\uFEFF]/g, "")
    .replace(/[\u2024\uFF0E]/g, ".")
    .trim();
  const cut = value.search(/[/?#]/);
  const head = cut === -1 ? value : value.slice(0, cut);
  // No spaces belong before the path (scheme and domain)
  value = head.replace(/\s+/g, "") + (cut === -1 ? "" : value.slice(cut));
  if (!value) return null;
  if (!/^[a-z][a-z0-9+.-]*:/i.test(value)) value = `https://${value}`;
  try {
    const u = new URL(value);
    if (u.protocol === "mailto:") return u.toString();
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    if (!u.hostname.includes(".")) return null;
    return u.toString();
  } catch {
    return null;
  }
}
