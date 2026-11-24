"use client";

import { useSyncExternalStore } from "react";
import { ProfileView, type ProfileData, type TradeLink } from "@/components/ProfileView";
import type { Link } from "@/db/schema";
import { getLookDraft, getServerLookDraft, subscribeLookDraft } from "./lookDraft";

/** The dashboard's phone preview, which also reflects unsaved Look & feel changes. */
export function LivePreview({ user, links, qa, trades }: { user: ProfileData; links: Link[]; qa?: { id: number; body: string; answer: string; answeredAt: Date }[]; trades?: TradeLink[] }) {
  const draft = useSyncExternalStore(subscribeLookDraft, getLookDraft, getServerLookDraft);
  const shown = draft ? { ...user, theme: draft.theme, style: draft.style } : user;
  return <ProfileView user={shown} links={links} qa={qa} trades={trades} preview />;
}
