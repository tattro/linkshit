import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { avatarUrl, ProfileView } from "./ProfileView";
import { ViewBeacon } from "./ViewBeacon";
import { LockScreen } from "./LockScreen";
import { TrackingPixels } from "./TrackingPixels";
import type { PublicProfile } from "@/lib/profile";
import { lockCookie, tokenMatches } from "@/lib/locks";

export function profileMetadata(profile: PublicProfile | null, path: string): Metadata {
  if (!profile) return { title: "Not found" };
  const name = profile.user.displayName || profile.user.handle;
  if (profile.user.lockCode) {
    return { title: `${name} (@${profile.user.handle})`, description: "This page needs a code.", robots: { index: false } };
  }
  const title = profile.user.seoTitle || `${name} (@${profile.user.handle})`;
  const description = profile.user.seoDescription || profile.user.bio || `All of ${name}'s links in one place.`;
  const shareTitle = profile.user.seoTitle || `${name} on linksh.it`;
  return {
    title,
    description,
    openGraph: { title: shareTitle, description, url: path, type: "profile" },
    twitter: { card: "summary_large_image", title: shareTitle, description },
    icons: avatarUrl(profile.user) ? { icon: avatarUrl(profile.user)! } : undefined,
  };
}

/** Whether a visitor still has to type the page's code. */
export async function pageLocked(profile: PublicProfile) {
  const code = profile.user.lockCode;
  if (!code) return false;
  const token = (await cookies()).get(lockCookie("page", profile.user.id))?.value;
  return !tokenMatches(token, "page", profile.user.id, code);
}

export async function PublicPage({ profile }: { profile: PublicProfile }) {
  const { user } = profile;
  if (await pageLocked(profile)) {
    return <LockScreen kind="page" id={user.id} title={user.displayName || `@${user.handle}`} />;
  }
  // Redirect mode: everyone goes straight to one link (through /go so the click counts)
  if (profile.redirectTo) redirect(`/go/${profile.redirectTo}`);
  return (
    <div className="min-h-screen [&>div]:min-h-screen">
      <ViewBeacon userId={user.id} />
      <TrackingPixels meta={user.metaPixel} ga={user.googleAnalytics} tiktok={user.tiktokPixel} />
      <ProfileView user={user} links={profile.links} />
    </div>
  );
}
