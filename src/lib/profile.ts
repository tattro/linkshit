import "server-only";
import { and, asc, eq, gt, isNull, or } from "drizzle-orm";
import { cache } from "react";
import { db, handleRedirects, links, offers, users } from "@/db";
import { redirectCutoff } from "@/lib/handleTaken";
import { liveLinks, offersLast } from "@/components/ProfileView";

/** Everything a public page needs, by handle or by custom domain. Null if missing or banned. */
export const getPublicProfile = cache(async (by: "handle" | "domain", key: string) => {
  const [user] = await db
    .select({
      id: users.id, handle: users.handle, displayName: users.displayName, bio: users.bio, theme: users.theme,
      style: users.style, socials: users.socials, avatarVersion: users.avatarVersion, bgVersion: users.bgVersion, bannedAt: users.bannedAt,
      tips: users.tips, signupEnabled: users.signupEnabled, signupPrompt: users.signupPrompt,
      redirectLinkId: users.redirectLinkId, lockCode: users.lockCode, seoTitle: users.seoTitle, seoDescription: users.seoDescription,
      metaPixel: users.metaPixel, googleAnalytics: users.googleAnalytics, tiktokPixel: users.tiktokPixel,
    })
    .from(users)
    .where(by === "handle" ? eq(users.handle, key) : eq(users.customDomain, key));
  if (!user || user.bannedAt) return null;
  const rows = await db
    .select({
      id: links.id, title: links.title, url: links.url, embed: links.embed, startsAt: links.startsAt, endsAt: links.endsAt,
      sensitive: links.sensitive, spotlight: links.spotlight, icon: links.icon, offerId: links.offerId,
      thumbVersion: links.thumbVersion, lockCode: links.lockCode,
    })
    .from(links)
    // Offers the advertiser has paused drop off every page
    .leftJoin(offers, eq(offers.id, links.offerId))
    .where(and(eq(links.userId, user.id), isNull(links.deletedAt), or(isNull(links.offerId), eq(offers.active, true))))
    .orderBy(asc(links.position), asc(links.id));
  const live = offersLast(liveLinks(rows)).map(({ lockCode, ...l }) => ({ ...l, locked: Boolean(lockCode) }));
  // Redirect mode only kicks in while the chosen link is live
  const redirectTo = live.find((l) => l.id === user.redirectLinkId)?.id ?? null;
  return { user, links: live, redirectTo };
});

export type PublicProfile = NonNullable<Awaited<ReturnType<typeof getPublicProfile>>>;

/** Where an old (renamed) handle points now, if it was renamed recently. */
export async function renamedTo(oldHandle: string): Promise<string | null> {
  const [row] = await db
    .select({ handle: users.handle })
    .from(handleRedirects)
    .innerJoin(users, eq(users.id, handleRedirects.userId))
    .where(and(eq(handleRedirects.handle, oldHandle), gt(handleRedirects.createdAt, redirectCutoff())));
  return row?.handle ?? null;
}
