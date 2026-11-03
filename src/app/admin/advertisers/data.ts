import { and, isNotNull, isNull, sql } from "drizzle-orm";
import { db, users } from "@/db";
import { CREATOR_TYPES, isCreatorType } from "@/lib/creatorTypes";

/**
 * ADVERTISER PREVIEW (admin-only, not live).
 * Real creators who ticked "open to advertisers" are mixed with sample creators so the screens
 * look filled in before there are users. Nothing here charges or pays anyone.
 */

export const LINKSHIT_CUT = 0.1; // linksh.it keeps 10% of each creator payout
export const HOLD_DAYS = 30; // commissions wait this long in case the sale is refunded

export type Creator = {
  id: string;
  sample: boolean;
  handle: string;
  name: string;
  niche: string; // CREATOR_TYPES key or ""
  bio: string;
  avatar: string | null;
  followers: { platform: string; count: number; url: string }[]; // creator-entered; verified later
  reach: string; // media kit "reach" in their own words
  views30: number;
  clicks30: number;
  countries: string[]; // top 3, ISO codes
  mobilePct: number;
  adult: boolean; // page or any link is 18+
  offerClicks: number;
  offerSales: number | null; // null until conversion tracking exists
};

export const nicheLabel = (n: string) => (isCreatorType(n) ? CREATOR_TYPES[n].label : "🤷 Not set");
export const NICHES = Object.keys(CREATOR_TYPES);

const S = (
  handle: string, name: string, niche: string, bio: string,
  followers: [string, number][], views30: number, clicks30: number, countries: string[], mobilePct: number,
  offerClicks: number, offerSales: number, adult = false,
): Creator => ({
  id: `s-${handle}`, sample: true, handle, name, niche, bio, avatar: null,
  followers: followers.map(([platform, count]) => ({ platform, count, url: "#" })),
  reach: "", views30, clicks30, countries, mobilePct, adult, offerClicks, offerSales,
});

const SAMPLES: Creator[] = [
  S("lofi.larry", "Lofi Larry", "musician", "Beats to cry to. New EP every full moon.", [["TikTok", 184000], ["Instagram", 22000], ["Spotify", 41000]], 31200, 9400, ["US", "GB", "BR"], 94, 1210, 38),
  S("couchpotatopod", "Couch Potato Pod", "podcaster", "Two guys, one couch, zero expertise.", [["YouTube", 58000], ["TikTok", 12000]], 14800, 3900, ["US", "CA", "AU"], 81, 640, 21),
  S("gymgremlin", "Gym Gremlin", "fitness", "Leg day is a lifestyle. Discount codes inside.", [["Instagram", 312000], ["TikTok", 95000]], 52000, 17800, ["US", "MX", "GB"], 97, 4020, 162),
  S("brokebutcooking", "Broke But Cooking", "creator", "$5 dinners that slap.", [["TikTok", 640000], ["YouTube", 88000]], 121000, 30500, ["US", "GB", "IE"], 96, 2890, 97),
  S("pixelpam", "Pixel Pam", "creator", "Speedruns and rage quits. Live Tue/Thu.", [["Twitch", 27000], ["YouTube", 41000]], 9900, 2600, ["DE", "US", "PL"], 72, 310, 9),
  S("thesadpainter", "The Sad Painter", "artist", "Paintings of sad vegetables. Prints available.", [["Instagram", 76000]], 7400, 2100, ["US", "FR", "NL"], 88, 0, 0),
  S("nightowl.after", "Night Owl", "adult", "Late-night content. 18+ only.", [["X", 210000]], 66000, 24000, ["US", "GB", "CA"], 91, 900, 30, true),
];

/** Opted-in creators with their last-30-day stats, plus samples. Never visitor-level data. */
export async function getCreators(): Promise<Creator[]> {
  const rows = await db
    .select({
      id: users.id, handle: users.handle, name: users.displayName, niche: users.creatorType, bio: users.bio,
      avatarVersion: users.avatarVersion, socials: users.socials, kit: users.mediaKit, adultGate: users.adultGate,
      views30: sql<number>`(select count(*)::int from events e where e.user_id = "users"."id" and e.kind = 'view' and e.created_at > now() - interval '30 days')`,
      clicks30: sql<number>`(select count(*)::int from events e where e.user_id = "users"."id" and e.kind = 'click' and e.created_at > now() - interval '30 days')`,
      mobilePct: sql<number>`(select coalesce(round(100.0 * count(*) filter (where e.device = 'mobile') / nullif(count(*), 0)), 0)::int from events e where e.user_id = "users"."id" and e.created_at > now() - interval '30 days')`,
      countries: sql<string[]>`(select coalesce(array_agg(c), '{}') from (select e.country c from events e where e.user_id = "users"."id" and e.country is not null and e.created_at > now() - interval '30 days' group by e.country order by count(*) desc limit 3) t)`,
      adultLinks: sql<boolean>`exists (select 1 from links l where l.user_id = "users"."id" and l.sensitive and l.deleted_at is null)`,
      offerClicks: sql<number>`(select coalesce(sum(l.clicks), 0)::int from links l where l.user_id = "users"."id" and l.offer_id is not null)`,
    })
    .from(users)
    .where(and(isNotNull(users.marketplaceInterestAt), isNull(users.bannedAt)));

  const real: Creator[] = rows.map((r) => ({
    id: String(r.id), sample: false, handle: r.handle, name: r.name || r.handle, niche: r.niche, bio: r.bio,
    avatar: r.avatarVersion > 0 ? `/avatar/${r.id}?v=${r.avatarVersion}` : null,
    // Follower counts aren't collected yet: show their social links so advertisers can check
    followers: Object.entries(r.socials).filter(([, u]) => u).map(([platform, url]) => ({ platform, count: 0, url: url! })),
    reach: r.kit?.reach ?? "", views30: r.views30, clicks30: r.clicks30, countries: r.countries, mobilePct: r.mobilePct,
    adult: r.adultGate || r.adultLinks || r.niche === "adult", offerClicks: r.offerClicks, offerSales: null,
  }));
  return [...real, ...SAMPLES];
}

export type Filters = { niche: string; country: string; minClicks: number; noAdult: boolean };

export function matches(c: Creator, f: Filters) {
  return (!f.niche || c.niche === f.niche)
    && (!f.country || c.countries.includes(f.country))
    && c.clicks30 >= f.minClicks
    && !(f.noAdult && c.adult);
}

export const ctr = (c: Pick<Creator, "views30" | "clicks30">) => (c.views30 ? Math.round((100 * c.clicks30) / c.views30) : 0);
export const short = (n: number) => (n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${Math.round(n / 1e3)}K` : String(n));
export const usd = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
