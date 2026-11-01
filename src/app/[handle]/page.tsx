import { notFound, permanentRedirect } from "next/navigation";
import type { Metadata } from "next";
import { profileMetadata, PublicPage } from "@/components/PublicPage";
import { getPublicProfile } from "@/lib/profile";

export async function generateMetadata({ params }: PageProps<"/[handle]">): Promise<Metadata> {
  const { handle } = await params;
  const profile = await getPublicProfile("handle", decodeURIComponent(handle).toLowerCase());
  return profileMetadata(profile, `/${profile?.user.handle ?? ""}`);
}

export default async function ProfilePage({ params }: PageProps<"/[handle]">) {
  const { handle: raw } = await params;
  const decoded = decodeURIComponent(raw);
  const handle = decoded.replace(/^@/, "").toLowerCase();
  if (handle !== decoded) permanentRedirect(`/${handle}`);
  const profile = await getPublicProfile("handle", handle);
  if (!profile) notFound();
  return <PublicPage profile={profile} />;
}

// Every request depends on the session or the database, so render on demand.
export const instant = false;
