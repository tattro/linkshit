"use client";

import { useSyncExternalStore } from "react";
import { ProfileView, type ProfileData } from "@/components/ProfileView";
import type { Link } from "@/db/schema";
import { getLookDraft, getServerLookDraft, subscribeLookDraft } from "./lookDraft";

/** The dashboard's phone preview, which also reflects unsaved Look & feel changes. */
export function LivePreview({ user, links, qa }: { user: ProfileData; links: Link[]; qa?: { id: number; body: string; answer: string; answeredAt: Date }[] }) {
  const draft = useSyncExternalStore(subscribeLookDraft, getLookDraft, getServerLookDraft);
  const shown = draft ? { ...user, theme: draft.theme, style: draft.style } : user;
  return <ProfileView user={shown} links={links} qa={qa} preview />;
}
