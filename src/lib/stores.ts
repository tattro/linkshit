/** Shops and course platforms where we tick "grab picture & price" by default. Safe for client code. */
export const STORE_HOSTS = [
  "gumroad.com", "stan.store", "teachable.com", "kajabi.com", "mykajabi.com", "thinkific.com", "podia.com", "payhip.com",
  "myshopify.com", "etsy.com", "lemonsqueezy.com", "patreon.com", "skool.com", "udemy.com", "bandcamp.com", "bigcartel.com",
];

export function isStoreUrl(raw: string): boolean {
  const t = raw.trim();
  if (!t) return false;
  try {
    const host = new URL(/^https?:\/\//i.test(t) ? t : `https://${t}`).hostname.toLowerCase();
    return STORE_HOSTS.some((h) => host === h || host.endsWith(`.${h}`));
  } catch {
    return false;
  }
}
