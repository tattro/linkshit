// Custom domains: users point their own domain at linksh.it and get their page at its root.
// Domains are attached to the Vercel project through the Vercel API, which also issues SSL.

const DOMAIN_RE = /^(?=.{4,253}$)(?!-)([a-z0-9-]{1,63}\.)+[a-z]{2,63}$/;

/** "https://Links.Example.com/" → "links.example.com", or null if it isn't a usable domain. */
export function normalizeDomain(raw: string): string | null {
  let v = raw.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "").replace(/\.$/, "");
  v = v.replace(/:\d+$/, "");
  if (!DOMAIN_RE.test(v)) return null;
  if (/(^|\.)(linksh\.it|vercel\.app|vercel\.com|localhost)$/.test(v)) return null;
  return v;
}

/** Hosts that serve linksh.it itself rather than someone's custom domain. */
export function isMainHost(host: string): boolean {
  const h = host.toLowerCase().replace(/:\d+$/, "");
  let site = "linksh.it";
  try { site = new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://linksh.it").hostname; } catch {}
  return h === site || h === `www.${site}` || h === "linksh.it" || h === "www.linksh.it" ||
    h === "localhost" || h === "127.0.0.1" || h.endsWith(".vercel.app");
}

/** Apex domains (example.com) need an A record; subdomains (links.example.com) a CNAME. */
export const isApex = (domain: string) => domain.split(".").length === 2;

const API = "https://api.vercel.com";
const env = () => ({
  token: process.env.VERCEL_API_TOKEN,
  project: process.env.VERCEL_PROJECT_ID,
  team: process.env.VERCEL_TEAM_ID,
});

export const domainsEnabled = () => Boolean(env().token && env().project);

async function vercel(path: string, init?: RequestInit) {
  const { token, team } = env();
  const url = `${API}${path}${team ? `${path.includes("?") ? "&" : "?"}teamId=${team}` : ""}`;
  const res = await fetch(url, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...init?.headers },
    cache: "no-store",
  });
  const body = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, body };
}

export async function addProjectDomain(domain: string): Promise<string | null> {
  const r = await vercel(`/v10/projects/${env().project}/domains`, { method: "POST", body: JSON.stringify({ name: domain }) });
  if (r.ok) return null;
  const code = r.body?.error?.code;
  if (code === "domain_already_in_use" || code === "domain_taken") return "That domain is already connected to another site.";
  if (r.status === 409) return null; // already on this project
  console.error("[domains] add failed", r.status, r.body);
  return "Couldn't connect that domain. Double-check it and try again.";
}

export async function removeProjectDomain(domain: string) {
  const r = await vercel(`/v9/projects/${env().project}/domains/${domain}`, { method: "DELETE" });
  if (!r.ok && r.status !== 404) console.error("[domains] remove failed", r.status, r.body);
}

export type DomainStatus = { state: "live" | "pending" | "error"; detail?: string; txt?: { name: string; value: string } };

export async function domainStatus(domain: string): Promise<DomainStatus> {
  const [info, config] = await Promise.all([
    vercel(`/v9/projects/${env().project}/domains/${domain}`),
    vercel(`/v6/domains/${domain}/config`),
  ]);
  if (!info.ok) return { state: "error", detail: "This domain isn't connected. Remove it and add it again." };
  // Vercel asks for a TXT record when the domain is already used elsewhere on Vercel
  const v = info.body?.verification?.find?.((x: { type: string }) => x.type === "TXT");
  if (info.body?.verified === false && v) return { state: "pending", txt: { name: v.domain, value: v.value } };
  if (config.ok && config.body?.misconfigured === false) return { state: "live" };
  return { state: "pending" };
}
