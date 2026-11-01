import "server-only";

// Domains we never allow, regardless of Safe Browsing. Mostly URL shorteners and
// IP-logger services that are used to hide where a link really goes.
const BLOCKED_HOSTS = [
  "grabify.link", "iplogger.org", "iplogger.com", "2no.co", "yip.su", "blasze.com",
  "ps3cfw.com", "bmwforum.co", "leancoding.co", "spottyfly.com", "stopify.co",
  "freegiftcards.co", "discordapp.gift", "discord-nitro.gift", "steamcommunlty.com",
];

function hostBlocked(host: string) {
  const h = host.toLowerCase().replace(/^www\./, "");
  return BLOCKED_HOSTS.some((b) => h === b || h.endsWith(`.${b}`));
}

/**
 * Returns a reason string if the URL looks unsafe, otherwise null.
 * Uses Google Safe Browsing when GOOGLE_SAFE_BROWSING_KEY is set.
 */
export async function unsafeReason(url: string): Promise<string | null> {
  let u: URL;
  try { u = new URL(url); } catch { return "That doesn't look like a valid web address."; }
  if (u.protocol === "mailto:") return null;
  if (hostBlocked(u.hostname)) return "That site is on our naughty list. Link something else.";
  if (/^(localhost|127\.|10\.|192\.168\.|0\.)/.test(u.hostname)) return "That address only works on your own computer.";
  if (u.username || u.password) return "Links with passwords baked in aren't allowed.";

  const key = process.env.GOOGLE_SAFE_BROWSING_KEY;
  if (!key) return null;
  try {
    const res = await fetch(`https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${key}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client: { clientId: "linksh.it", clientVersion: "1.0" },
        threatInfo: {
          threatTypes: ["MALWARE", "SOCIAL_ENGINEERING", "UNWANTED_SOFTWARE", "POTENTIALLY_HARMFUL_APPLICATION"],
          platformTypes: ["ANY_PLATFORM"],
          threatEntryTypes: ["URL"],
          threatEntries: [{ url }],
        },
      }),
      signal: AbortSignal.timeout(3000),
    });
    if (res.ok && (await res.json()).matches?.length) return "Google flags that link as dangerous, so we can't add it.";
  } catch {
    // Fail open: a Safe Browsing outage shouldn't stop people editing their page
  }
  return null;
}
