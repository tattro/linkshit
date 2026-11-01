import { asc, eq } from "drizzle-orm";
import { notFound, permanentRedirect } from "next/navigation";
import type { Metadata } from "next";
import { cache } from "react";
import { db, links, users } from "@/db";
import { avatarUrl, liveLinks, ProfileView } from "@/components/ProfileView";
import { ViewBeacon } from "@/components/ViewBeacon";

const getProfile = cache(async (handle: string) => {
  const [user] = await db
    .select({
      id: users.id, handle: users.handle, displayName: users.displayName, bio: users.bio, theme: users.theme,
      style: users.style, socials: users.socials, avatarVersion: users.avatarVersion, bgVersion: users.bgVersion, bannedAt: users.bannedAt,
    })
    .from(users)
    .where(eq(users.handle, handle));
  if (!user || user.bannedAt) return null;
  const rows = await db
    .select({ id: links.id, title: links.title, url: links.url, embed: links.embed, startsAt: links.startsAt, endsAt: links.endsAt })
    .from(links)
    .where(eq(links.userId, user.id))
    .orderBy(asc(links.position), asc(links.id));
  return { user, links: liveLinks(rows) };
});

export async function generateMetadata({ params }: PageProps<"/[handle]">): Promise<Metadata> {
  const { handle } = await params;
  const profile = await getProfile(decodeURIComponent(handle).toLowerCase());
  if (!profile) return { title: "Not found" };
  const name = profile.user.displayName || profile.user.handle;
  const description = profile.user.bio || `All of ${name}'s links in one place.`;
  return {
    title: `${name} (@${profile.user.handle})`,
    description,
    openGraph: { title: `${name} on linksh.it`, description, url: `/${profile.user.handle}`, type: "profile" },
    twitter: { card: "summary_large_image", title: `${name} on linksh.it`, description },
    icons: avatarUrl(profile.user) ? { icon: avatarUrl(profile.user)! } : undefined,
  };
}

export default async function ProfilePage({ params }: PageProps<"/[handle]">) {
  const { handle: raw } = await params;
  const decoded = decodeURIComponent(raw);
  const handle = decoded.replace(/^@/, "").toLowerCase();
  if (handle !== decoded) permanentRedirect(`/${handle}`);
  const profile = await getProfile(handle);
  if (!profile) notFound();

  return (
    <div className="min-h-screen [&>div]:min-h-screen">
      <ViewBeacon userId={profile.user.id} />
      <ProfileView user={profile.user} links={profile.links} />
    </div>
  );
}

// Every request depends on the session or the database, so render on demand.
export const instant = false;
