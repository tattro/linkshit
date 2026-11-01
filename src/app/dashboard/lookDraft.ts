"use client";

import type { Style } from "@/db/schema";

/** Unsaved Look & feel choices, shared between the form and the phone preview. */
export type LookDraft = { theme: string; style: Style } | null;

let draft: LookDraft = null;
const listeners = new Set<() => void>();

export function setLookDraft(next: LookDraft) {
  draft = next;
  listeners.forEach((l) => l());
}

export function subscribeLookDraft(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export const getLookDraft = () => draft;
export const getServerLookDraft = (): LookDraft => null;
