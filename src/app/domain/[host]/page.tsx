import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getPublicProfile } from "@/lib/profile";
import { profileMetadata, PublicPage } from "@/components/PublicPage";

// Reached through src/proxy.ts when someone visits a custom domain's root.
export async function generateMetadata({ params }: PageProps<"/domain/[host]">): Promise<Metadata> {
  const { host } = await params;
  return profileMetadata(await getPublicProfile("domain", decodeURIComponent(host)), "/");
}

export default async function DomainPage({ params }: PageProps<"/domain/[host]">) {
  const { host } = await params;
  const profile = await getPublicProfile("domain", decodeURIComponent(host));
  if (!profile) notFound();
  return <PublicPage profile={profile} />;
}

export const instant = false;
