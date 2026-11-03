/** The joke "Verified by ___" badge: anyone can get "verified" by whoever they like. */

export const VERIFIED_BY_MAX = 40;

export const VERIFIED_BY_SUGGESTIONS = [
  "your mom", "your dad", "your gay best friend", "your therapist", "your cat", "God himself",
  "your ex", "the group chat", "your landlord", "a guy named Steve",
];

// Real platforms, so nobody passes it off as an official check
const PLATFORMS = [
  "instagram", "insta", "ig", "tiktok", "meta", "facebook", "fb", "x", "twitter", "youtube", "yt", "spotify",
  "google", "apple", "linkshit", "linksh it", "linkshit team", "snapchat", "threads", "linkedin", "twitch", "discord",
  "reddit", "pinterest", "onlyfans", "amazon", "microsoft", "openai",
];

/** Lowercase words only: "Linksh.it" → "linksh it", "TikTok!" → "tiktok". */
const words = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();

/** Null when fine, otherwise a short reason to show. */
export function verifiedByProblem(raw: string): string | null {
  const s = raw.trim();
  if (!s) return "Type who's verifying you.";
  if (s.length > VERIFIED_BY_MAX) return `Keep it under ${VERIFIED_BY_MAX} characters.`;
  if (/https?:|www\.|\.(com|net|org|io|co|it|me|ly)\b|@/i.test(s)) return "No links or @handles in your badge.";
  const w = ` ${words(s)} `;
  if (PLATFORMS.some((p) => w.includes(` ${p} `)) || w.replace(/ /g, "").includes("linkshit")) {
    return "Nice try. Real platforms can't verify you here. Your mom can, though.";
  }
  return null;
}
