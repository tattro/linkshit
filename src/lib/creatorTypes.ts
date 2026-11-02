/**
 * "What do you do?" Only changes what we suggest first (category ideas, the
 * Get started wording, which extras get a "Suggested" tag). Nothing is ever
 * hidden or locked by it.
 */
export const CREATOR_TYPES = {
  musician: { label: "🎸 Musician", categories: ["Music", "Shows", "Merch", "Videos"], firstLinks: "Add your music (Spotify, Apple Music…)", grow: ["signup", "tips"] },
  fitness: { label: "💪 Fitness", categories: ["Programs", "Book a session", "Free workouts", "Shop"], firstLinks: "Add your programs or booking link", grow: ["contact", "signup"] },
  business: { label: "🏪 Business", categories: ["Services", "Book", "Shop", "Find us", "Reviews"], firstLinks: "Add your website, booking and location", grow: ["contact", "signup"] },
  artist: { label: "🎨 Artist", categories: ["Portfolio", "Commissions", "Shop", "Prints"], firstLinks: "Add your portfolio and shop", grow: ["contact", "tips"] },
  podcaster: { label: "🎙️ Podcaster", categories: ["Episodes", "Listen", "Sponsors", "Merch"], firstLinks: "Add where people can listen", grow: ["signup", "qa"] },
  creator: { label: "📱 Content creator", categories: ["Videos", "Socials", "Shop", "Collabs"], firstLinks: "Add your latest video and socials", grow: ["qa", "tips"] },
  other: { label: "🤷 Something else", categories: ["Projects", "Business", "Shop", "Socials"], firstLinks: "Add 3 links", grow: [] },
} as const;

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
