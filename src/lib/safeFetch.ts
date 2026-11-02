import "server-only";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

// Fetching pages people paste is a classic way to poke at internal networks,
// so every hop is checked: public http(s) only, no private/loopback/metadata IPs.
function privateIp(ip: string): boolean {
  if (isIP(ip) === 6) {
    const v = ip.toLowerCase();
    if (v === "::1" || v === "::") return true;
    if (v.startsWith("fc") || v.startsWith("fd") || v.startsWith("fe80")) return true;
    const mapped = v.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    return mapped ? privateIp(mapped[1]) : false;
  }
  const [a, b] = ip.split(".").map(Number);
  return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224;
}

async function publicHost(u: URL): Promise<boolean> {
  if (u.protocol !== "https:" && u.protocol !== "http:") return false;
  if (u.username || u.password) return false;
  if (u.port && u.port !== "80" && u.port !== "443") return false;
  if (process.env.UNSAFE_ALLOW_PRIVATE_FETCH_FOR_TESTS === "1") return true;
  const host = u.hostname.replace(/^\[|\]$/g, "");
  if (isIP(host)) return !privateIp(host);
  try {
    const addrs = await lookup(host, { all: true });
    return addrs.length > 0 && addrs.every((a) => !privateIp(a.address));
  } catch {
    return false;
  }
}

/**
 * GET a public URL (following up to 3 checked redirects), reading at most maxBytes.
 * Over the cap it gives up, or with `truncate` keeps the first maxBytes (fine for HTML heads).
 */
export async function safeFetch(url: string, { maxBytes, accept, truncate = false }: { maxBytes: number; accept: string; truncate?: boolean }) {
  let current = new URL(url);
  for (let hop = 0; hop < 4; hop++) {
    if (!(await publicHost(current))) return null;
    const res = await fetch(current, {
      redirect: "manual",
      headers: { accept, "user-agent": "Mozilla/5.0 (compatible; linksh.it preview bot; +https://linksh.it)" },
      signal: AbortSignal.timeout(5000),
    });
    if (res.status >= 300 && res.status < 400) {
      const next = res.headers.get("location");
      if (!next) return null;
      current = new URL(next, current);
      continue;
    }
    if (!res.ok || !res.body) return null;
    const reader = res.body.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > maxBytes) {
        await reader.cancel();
        if (!truncate) return null;
        chunks.push(value.subarray(0, value.length - (size - maxBytes)));
        break;
      }
      chunks.push(value);
    }
    return { url: current, contentType: res.headers.get("content-type") ?? "", body: Buffer.concat(chunks) };
  }
  return null;
}
