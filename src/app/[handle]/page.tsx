import { notFound, permanentRedirect, redirect } from "next/navigation";
import type { Metadata } from "next";
import { profileMetadata, PublicPage } from "@/components/PublicPage";
import { getPublicProfile, renamedTo, waitingForConfirm } from "@/lib/profile";
import { NotLiveYet } from "@/components/NotLiveYet";

export async function generateMetadata({ params }: PageProps<"/[handle]">): Promise<Metadata> {
  const { handle } = await params;
  const key = decodeURIComponent(handle).replace(/^@/, "").toLowerCase();
  const profile = await getPublicProfile("handle", key);
  if (!profile) {
    if (await waitingForConfirm(key)) return { title: "Coming soon", robots: { index: false } };
    // Resolved before streaming for crawlers and link previews, so they get a real redirect or 404
    const moved = await renamedTo(key);
    if (moved) redirect(`/${moved}`);
    notFound();
  }
  // Crawlers get a real redirect in redirect mode (when the page isn't locked)
  if (profile.redirectTo && !profile.user.lockCode) redirect(`/go/${profile.redirectTo}`);
  return profileMetadata(profile, `/${profile?.user.handle ?? ""}`);
}

export default async function ProfilePage({ params }: PageProps<"/[handle]">) {
  const { handle: raw } = await params;
  const decoded = decodeURIComponent(raw);
  const handle = decoded.replace(/^@/, "").toLowerCase();
  if (handle !== decoded) permanentRedirect(`/${handle}`);
  const profile = await getPublicProfile("handle", handle);
  if (!profile) {
    if (await waitingForConfirm(handle)) return <NotLiveYet handle={handle} />;
    const moved = await renamedTo(handle);
    if (moved) redirect(`/${moved}`);
    notFound();
  }
  return <PublicPage profile={profile} />;
}

// Every request depends on the session or the database, so render on demand.
export const instant = false;
