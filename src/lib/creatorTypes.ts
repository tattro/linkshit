/**
 * "What do you do?" Only changes what we suggest first (category ideas, the
 * Get started wording, which extras get a "Suggested" tag). Nothing is ever
 * hidden or locked by it.
 */
type TypeInfo = {
  label: string;
  /** One line on the welcome card */
  blurb: string;
  categories: readonly string[];
  firstLinks: string;
  grow: readonly string[];
  /** A tip above Add a link while the page has fewer than 3 links */
  tip: string;
  linkPlaceholder: string;
};

export const CREATOR_TYPES = {
  musician: {
    label: "🎸 Musician", blurb: "Songs, shows, merch", categories: ["Music", "Shows", "Merch", "Videos"],
    firstLinks: "Add your music (Spotify, Apple Music…)", grow: ["signup", "tips"],
    tip: "Paste a Spotify or Apple Music song link. We add \"Listen on\" buttons for every app automatically.",
    linkPlaceholder: "open.spotify.com/track/…",
  },
  podcaster: {
    label: "🎙️ Podcaster", blurb: "Episodes, where to listen, sponsors", categories: ["Episodes", "Listen", "Sponsors", "Merch"],
    firstLinks: "Add where people can listen", grow: ["signup", "qa"],
    tip: "Paste your show on Spotify or Apple Podcasts, then tick \"Show it right on my page\" so people can play it there.",
    linkPlaceholder: "open.spotify.com/show/…",
  },
  course: {
    label: "🧑‍🏫 Coach", blurb: "Coaching calls, courses, free stuff", categories: ["Coaching", "Courses", "Free stuff", "Testimonials"],
    firstLinks: "Add your course or booking page", grow: ["signup", "contact"],
    tip: "Paste your course page (Teachable, Kajabi, Stan, Gumroad…) and your Calendly or Cal.com link for calls. Booking links can show as a calendar right on your page.",
    linkPlaceholder: "yourcourse.com",
  },
  creator: {
    label: "📱 Content creator", blurb: "Videos, socials, brand deals", categories: ["Videos", "Socials", "Shop", "Collabs"],
    firstLinks: "Add your latest video and socials", grow: ["qa", "tips"],
    tip: "Paste your latest YouTube or TikTok and tick \"Show it right on my page\" so it plays there. Add your socials under Social icons.",
    linkPlaceholder: "youtube.com/watch?v=…",
  },
  artist: {
    label: "🎨 Artist", blurb: "Portfolio, commissions, prints", categories: ["Portfolio", "Commissions", "Shop", "Prints"],
    firstLinks: "Add your portfolio and shop", grow: ["contact", "tips"],
    tip: "Start with your portfolio and your shop. Turn on the contact form (Grow tab) so people can ask about commissions.",
    linkPlaceholder: "yourportfolio.com",
  },
  fitness: {
    label: "💪 Fitness", blurb: "Programs, sessions, discount codes", categories: ["Programs", "Book a session", "Free workouts", "Shop"],
    firstLinks: "Add your programs or booking link", grow: ["contact", "signup"],
    tip: "Add your programs and a booking link. Got a supplement or gear code? Put it under More options → Discount code.",
    linkPlaceholder: "yourprogram.com",
  },
  business: {
    label: "💼 Business", blurb: "Services, bookings, location", categories: ["Services", "Book", "Shop", "Find us", "Reviews"],
    firstLinks: "Add your website, booking and location", grow: ["contact", "signup"],
    tip: "Add your website, a booking link and a Google Maps link so people can find you.",
    linkPlaceholder: "yourbusiness.com",
  },
  adult: {
    label: "🔞 Adult creator", blurb: "OnlyFans, Fansly, exclusives, tips", categories: ["Exclusive", "Socials", "Tip me", "Customs"],
    firstLinks: "Add your OnlyFans, Fansly or exclusive page", grow: ["tips", "qa"],
    tip: "New links get the 🔞 18+ warning by default, so visitors confirm their age before anything opens. That also keeps Instagram and TikTok happier about your bio link.",
    linkPlaceholder: "onlyfans.com/yourname",
  },
  other: {
    label: "🤹 I do a lot of shit", blurb: "Just give me all the features", categories: ["Projects", "Business", "Shop", "Socials"],
    firstLinks: "Add 3 links", grow: [],
    tip: "", linkPlaceholder: "yourwebsite.com",
  },
} as const satisfies Record<string, TypeInfo>;

export type CreatorType = keyof typeof CREATOR_TYPES;
export type GrowFeature = "signup" | "qa" | "contact" | "tips";

export const isCreatorType = (v: unknown): v is CreatorType => typeof v === "string" && v in CREATOR_TYPES;

/** Default category suggestions for everyone, after the type-specific ones. */
export const GENERAL_CATEGORIES = ["Music", "Projects", "Business", "Art", "Videos", "Shop", "Podcast", "Socials", "Writing", "Events"];

export function categoryIdeas(type: string): string[] {
  const own = isCreatorType(type) ? CREATOR_TYPES[type].categories : [];
  return [...new Set([...own, ...GENERAL_CATEGORIES])];
}

export function suggestedGrow(type: string): readonly string[] {
  return isCreatorType(type) ? CREATOR_TYPES[type].grow : [];
}

/** The cards people pick from. Older types (creator, artist, fitness) still work for pages that have them. */
export const MAIN_TYPES = ["musician", "podcaster", "course", "business", "adult", "other"] as const;
