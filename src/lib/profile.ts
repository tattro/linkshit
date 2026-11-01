import "server-only";
import { asc, eq } from "drizzle-orm";
import { cache } from "react";
import { db, links, users } from "@/db";
import { liveLinks } from "@/components/ProfileView";

/** Everything a public page needs, by handle or by custom domain. Null if missing or banned. */
export const getPublicProfile = cache(async (by: "handle" | "domain", key: string) => {
  const [user] = await db
    .select({
      id: users.id, handle: users.handle, displayName: users.displayName, bio: users.bio, theme: users.theme,
      style: users.style, socials: users.socials, avatarVersion: users.avatarVersion, bgVersion: users.bgVersion, bannedAt: users.bannedAt,
      tips: users.tips, signupEnabled: users.signupEnabled, signupPrompt: users.signupPrompt,
    })
    .from(users)
    .where(by === "handle" ? eq(users.handle, key) : eq(users.customDomain, key));
  if (!user || user.bannedAt) return null;
  const rows = await db
    .select({
      id: links.id, title: links.title, url: links.url, embed: links.embed, startsAt: links.startsAt, endsAt: links.endsAt,
      sensitive: links.sensitive, spotlight: links.spotlight, icon: links.icon,
    })
    .from(links)
    .where(eq(links.userId, user.id))
    .orderBy(asc(links.position), asc(links.id));
  return { user, links: liveLinks(rows) };
});

export type PublicProfile = NonNullable<Awaited<ReturnType<typeof getPublicProfile>>>;
