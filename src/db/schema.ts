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
  text?: string;
  button?: string;
  buttonText?: string;
  shape?: "rounded" | "pill" | "square" | "outline";
  font?: "sans" | "serif" | "mono" | "rounded" | "display";
  bgTint?: "dark" | "light"; // wash over a background photo so text stays readable
};

export const users = pgTable(
  "users",
  {
    id: serial("id").primaryKey(),
    email: text("email").notNull(),
    passwordHash: text("password_hash").notNull(),
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
    emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
    isAdmin: boolean("is_admin").notNull().default(false),
    bannedAt: timestamp("banned_at", { withTimezone: true }),
    banReason: text("ban_reason"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("users_email_idx").on(t.email),
    uniqueIndex("users_handle_idx").on(t.handle),
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
