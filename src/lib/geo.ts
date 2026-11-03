/** "Send visitors from these countries somewhere else." Safe for client code. */
export type GeoRule = { c: string; url: string };

export const MAX_GEO_RULES = 3;

// Two-letter codes as Vercel reports them, most common first
export const GEO_COUNTRIES = [
  "US", "GB", "CA", "AU", "IE", "NZ", "DE", "FR", "ES", "IT", "NL", "BE", "CH", "AT", "SE", "NO", "DK", "FI", "PL", "PT",
  "BR", "MX", "AR", "CO", "CL", "IN", "JP", "KR", "CN", "SG", "PH", "ID", "MY", "TH", "VN", "AE", "SA", "TR", "IL", "ZA",
  "NG", "KE", "EG", "UA", "RU",
];

export function countryName(code: string): string {
  try { return new Intl.DisplayNames(["en"], { type: "region" }).of(code) ?? code; } catch { return code; }
}

/** Where a visitor from this country goes, if a rule covers them. */
export function geoTarget(rules: GeoRule[] | null | undefined, country: string | null): string | null {
  if (!rules || !country) return null;
  return rules.find((r) => r.c === country.toUpperCase())?.url ?? null;
}
