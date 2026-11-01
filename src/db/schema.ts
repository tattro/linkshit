import {
  pgTable,
  serial,
  text,
  integer,
  boolean,
  jsonb,
  timestamp,
  uniqueIndex,
  index,
  customType,
  primaryKey,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";

const bytea = customType<{ data: Buffer }>({ dataType: () => "bytea" });

export type Socials = Partial<Record<string, string>>;

/** Tip jar destinations, keyed by provider id (see lib/tips.ts). Values are full URLs. */
export type Tips = Partial<Record<string, string>>;

/** Optional per-user overrides layered on top of the chosen theme preset. */
export type Style = {
  bg?: string; // hex
  bg2?: string; // second gradient stop; when set, the background is a gradient
  bgDir?: "down" | "diag" | "right" | "radial";
  chaos?: boolean; // everything bounces around the page
  text?: string;
  button?: string;
  buttonText?: string;
  shape?: "rounded" | "pill" | "square" | "outline";
  font?: string; // id from FONTS in lib/style.ts
  bgTint?: "dark" | "light"; // wash over a background photo so text stays readable
};

export const users = pgTable(
  "users",
  {
    id: serial("id").primaryKey(),
    // Null for extra pages, which belong to the account in ownerId and have no login of their own
    email: text("email"),
    passwordHash: text("password_hash"),
    ownerId: integer("owner_id").references((): AnyPgColumn => users.id, { onDelete: "cascade" }),
    handle: text("handle").notNull(),
    displayName: text("display_name").notNull().default(""),
    bio: text("bio").notNull().default(""),
    theme: text("theme").notNull().default("classic"),
    style: jsonb("style").$type<Style>().notNull().default({}),
    socials: jsonb("socials").$type<Socials>().notNull().default({}),
    avatarVersion: integer("avatar_version").notNull().default(0),
    bgVersion: integer("bg_version").notNull().default(0),
    // On phones, open YouTube/Spotify/Instagram/X links in their apps
    openInApp: boolean("open_in_app").notNull().default(true),
    tips: jsonb("tips").$type<Tips>().notNull().default({}),
    // Email signup box on the public page
    signupEnabled: boolean("signup_enabled").notNull().default(false),
    signupPrompt: text("signup_prompt").notNull().default(""),
    // "Message me" form on the page; messages land in the dashboard and the owner's inbox
    contactEnabled: boolean("contact_enabled").notNull().default(false),
    // e.g. "links.example.com"; serves this user's page at that domain's root
    customDomain: text("custom_domain"),
    // Stats email on/off (name is historical) and how often
    weeklyEmail: boolean("weekly_email").notNull().default(true),
    statsEvery: text("stats_every").$type<"week" | "month">().notNull().default("week"),
    // Opted in to "let advertisers reach out to me" (null = no)
    marketplaceInterestAt: timestamp("marketplace_interest_at", { withTimezone: true }),
    // Redirect mode: every visitor goes straight to this link
    redirectLinkId: integer("redirect_link_id"),
    // Visitors type this code before they see the page (null = open)
    lockCode: text("lock_code"),
    // Custom title/description for Google and link previews
    seoTitle: text("seo_title").notNull().default(""),
    seoDescription: text("seo_description").notNull().default(""),
    // Tracking pixels on the public page
    metaPixel: text("meta_pixel").notNull().default(""),
    googleAnalytics: text("google_analytics").notNull().default(""),
    tiktokPixel: text("tiktok_pixel").notNull().default(""),
    // Add utm_source=linksh.it etc. to outgoing links
    utm: boolean("utm").notNull().default(false),
    emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
    isAdmin: boolean("is_admin").notNull().default(false),
    bannedAt: timestamp("banned_at", { withTimezone: true }),
    banReason: text("ban_reason"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("users_email_idx").on(t.email),
    uniqueIndex("users_handle_idx").on(t.handle),
    uniqueIndex("users_custom_domain_idx").on(t.customDomain),
    index("users_owner_idx").on(t.ownerId),
  ],
);

export const avatars = pgTable("avatars", {
  userId: integer("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  data: bytea("data").notNull(),
  contentType: text("content_type").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Thumbnail images on link buttons. */
export const linkThumbs = pgTable("link_thumbs", {
  linkId: integer("link_id")
    .primaryKey()
    .references((): AnyPgColumn => links.id, { onDelete: "cascade" }),
  data: bytea("data").notNull(),
  contentType: text("content_type").notNull(),
});

/** Background photos for public pages. Same shape as avatars. */
export const backgrounds = pgTable("backgrounds", {
  userId: integer("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  data: bytea("data").notNull(),
  contentType: text("content_type").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const sessions = pgTable(
  "sessions",
  {
    // sha256 of the cookie token, so a DB leak doesn't hand out live sessions
    id: text("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    // Which of the account's pages the dashboard is editing (null = the main page)
    activePageId: integer("active_page_id").references(() => users.id, { onDelete: "set null" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  },
  (t) => [index("sessions_user_idx").on(t.userId)],
);

export const emailTokens = pgTable(
  "email_tokens",
  {
    // sha256 of the token in the emailed link
    id: text("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    kind: text("kind").$type<"verify" | "reset">().notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
  },
  (t) => [index("email_tokens_user_idx").on(t.userId, t.kind)],
);

/** Advertiser offers creators can add to their page from the Marketplace. */
export const offers = pgTable("offers", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(), // button text on the creator's page
  advertiser: text("advertiser").notNull(),
  description: text("description").notNull().default(""),
  payout: text("payout").notNull().default(""), // e.g. "30% per sale" or "$20 per signup"
  category: text("category").notNull().default(""),
  icon: text("icon").notNull().default(""),
  // Tracking URL; {handle} and {uid} get swapped for the creator's when they add it
  url: text("url").notNull(),
  active: boolean("active").notNull().default(true),
  // Off = creators request it and someone approves before it goes on their page
  autoApprove: boolean("auto_approve").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** A creator asking to run an offer that needs approval. */
export const offerRequests = pgTable(
  "offer_requests",
  {
    id: serial("id").primaryKey(),
    offerId: integer("offer_id").notNull().references(() => offers.id, { onDelete: "cascade" }),
    userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }), // the page
    status: text("status").$type<"pending" | "approved" | "declined">().notNull().default("pending"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    decidedAt: timestamp("decided_at", { withTimezone: true }),
  },
  (t) => [uniqueIndex("offer_requests_offer_user_idx").on(t.offerId, t.userId)],
);

export const links = pgTable(
  "links",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    url: text("url").notNull(),
    position: integer("position").notNull().default(0),
    clicks: integer("clicks").notNull().default(0),
    // Shown as an embedded player (YouTube/Spotify/SoundCloud) instead of a button
    embed: boolean("embed").notNull().default(false),
    // Visitors confirm before opening (18+ / sensitive)
    sensitive: boolean("sensitive").notNull().default(false),
    // Gently wiggles to draw attention
    spotlight: boolean("spotlight").notNull().default(false),
    // Optional emoji shown on the button; brand icons are picked automatically
    icon: text("icon").notNull().default(""),
    // Added from the Marketplace: pinned to the bottom with an affiliate disclaimer
    offerId: integer("offer_id").references(() => offers.id, { onDelete: "set null" }),
    // Small image shown on the button (stored in link_thumbs)
    thumbVersion: integer("thumb_version").notNull().default(0),
    // Visitors type this code before the link opens
    lockCode: text("lock_code"),
    // A section heading ("Music", "Merch") instead of a link; url is empty
    heading: boolean("heading").notNull().default(false),
    // Shown under the button with a copy button; tapping the link copies it too
    discountCode: text("discount_code"),
    // Android visitors go here instead (e.g. Google Play when url is the App Store)
    androidUrl: text("android_url"),
    // Set when "flushed": the link moves to the graveyard and can be revived
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    // Only visible between these times when set
    startsAt: timestamp("starts_at", { withTimezone: true }),
    endsAt: timestamp("ends_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("links_user_idx").on(t.userId, t.position)],
);

/** One row per public page view or link click, for the analytics page. */
export const events = pgTable(
  "events",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    linkId: integer("link_id").references(() => links.id, { onDelete: "set null" }),
    kind: text("kind").$type<"view" | "click">().notNull(),
    referrer: text("referrer"), // hostname only
    country: text("country"),
    device: text("device").$type<"mobile" | "tablet" | "desktop">(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("events_user_time_idx").on(t.userId, t.createdAt)],
);

/** Fixed-window counters for rate limiting. */
export const rateLimits = pgTable(
  "rate_limits",
  {
    key: text("key").notNull(),
    windowStart: timestamp("window_start", { withTimezone: true }).notNull(),
    count: integer("count").notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.key, t.windowStart] })],
);

export type User = typeof users.$inferSelect;
export type Link = typeof links.$inferSelect;

/** Emails collected by a user's signup box. */
export const subscribers = pgTable(
  "subscribers",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("subscribers_user_email_idx").on(t.userId, t.email)],
);

/** Messages visitors send through a page's contact form. */
export const messages = pgTable(
  "messages",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull().default(""),
    email: text("email").notNull(),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("messages_user_idx").on(t.userId, t.createdAt)],
);

/** Old handles keep redirecting to the new one for a while after a rename. */
export const handleRedirects = pgTable(
  "handle_redirects",
  {
    handle: text("handle").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("handle_redirects_user_idx").on(t.userId)],
);
