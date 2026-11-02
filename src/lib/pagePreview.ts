import "server-only";
import { sniffImage } from "@/lib/images";
import { safeFetch } from "@/lib/safeFetch";

const SYMBOLS: Record<string, string> = { USD: "$", CAD: "CA$", AUD: "A$", EUR: "€", GBP: "£", JPY: "¥", INR: "₹" };

const decode = (s: string) =>
  s.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");

/** <meta property|name="key" content="…"> in either attribute order. */
function meta(html: string, key: string): string | null {
  const k = key.replace(/[.:]/g, "\\$&");
  const a = html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${k}["'][^>]*content=["']([^"']*)["']`, "i"));
  const b = a ?? html.match(new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]*(?:property|name)=["']${k}["']`, "i"));
  return b ? decode(b[1]).trim() : null;
}

export function formatPrice(amount: string, currency: string): string | null {
  const n = Number(amount.replace(/,/g, ""));
  if (!Number.isFinite(n) || n < 0 || n > 1_000_000) return null;
  if (n === 0) return "Free";
  const cur = currency.toUpperCase().slice(0, 3);
  const num = Number.isInteger(n) ? String(n) : n.toFixed(2);
  return SYMBOLS[cur] ? `${SYMBOLS[cur]}${num}` : `${num} ${cur}`.trim();
}

/** Price from product meta tags, or from JSON-LD offers. */
export function findPrice(html: string): string | null {
  const amount = meta(html, "product:price:amount") ?? meta(html, "og:price:amount");
  if (amount) return formatPrice(amount, meta(html, "product:price:currency") ?? meta(html, "og:price:currency") ?? "USD");
  const ld = html.match(/"price"\s*:\s*"?([\d.,]+)"?[\s\S]{0,200}?"priceCurrency"\s*:\s*"([A-Za-z]{3})"/) ??
    html.match(/"priceCurrency"\s*:\s*"([A-Za-z]{3})"[\s\S]{0,200}?"price"\s*:\s*"?([\d.,]+)"?/);
  if (!ld) return null;
  return /^[A-Za-z]/.test(ld[1]) ? formatPrice(ld[2], ld[1]) : formatPrice(ld[1], ld[2]);
}

const MAX_IMAGE = 600 * 1024; // share images run bigger than hand-uploaded thumbnails

/** Picture + price from a product or course page. Anything missing is just left out. */
export async function pagePreview(url: string): Promise<{ image: { data: Buffer; contentType: string } | null; price: string | null }> {
  const empty = { image: null, price: null };
  try {
    const page = await safeFetch(url, { maxBytes: 1_500_000, accept: "text/html", truncate: true });
    if (!page || !/html/i.test(page.contentType)) return empty;
    const html = page.body.toString("utf8");
    const price = findPrice(html);
    let image = null;
    const src = meta(html, "og:image:secure_url") ?? meta(html, "og:image") ?? meta(html, "twitter:image");
    if (src) {
      const img = await safeFetch(new URL(src, page.url).toString(), { maxBytes: MAX_IMAGE, accept: "image/*" });
      const type = img ? sniffImage(img.body) : null;
      if (img && type) image = { data: img.body, contentType: type };
    }
    return { image, price };
  } catch {
    return empty;
  }
}
