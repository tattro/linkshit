import type { Metadata } from "next";
import { avatarUrl, ProfileView } from "./ProfileView";
import { ViewBeacon } from "./ViewBeacon";
import type { PublicProfile } from "@/lib/profile";

export function profileMetadata(profile: PublicProfile | null, path: string): Metadata {
  if (!profile) return { title: "Not found" };
  const name = profile.user.displayName || profile.user.handle;
  const description = profile.user.bio || `All of ${name}'s links in one place.`;
  return {
    title: `${name} (@${profile.user.handle})`,
    description,
    openGraph: { title: `${name} on linksh.it`, description, url: path, type: "profile" },
    twitter: { card: "summary_large_image", title: `${name} on linksh.it`, description },
    icons: avatarUrl(profile.user) ? { icon: avatarUrl(profile.user)! } : undefined,
  };
}

export function PublicPage({ profile }: { profile: PublicProfile }) {
  return (
    <div className="min-h-screen [&>div]:min-h-screen">
      <ViewBeacon userId={profile.user.id} />
      <ProfileView user={profile.user} links={profile.links} />
    </div>
  );
}

