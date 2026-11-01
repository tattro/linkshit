import type { CSSProperties } from "react";
import type { Style } from "@/db/schema";

export const FONTS = [
  { id: "sans", name: "Clean", css: "var(--font-geist-sans), system-ui, sans-serif" },
  { id: "serif", name: "Fancy", css: "var(--font-serif), Georgia, serif" },
  { id: "mono", name: "Hacker", css: "var(--font-geist-mono), ui-monospace, monospace" },
  { id: "rounded", name: "Friendly", css: "var(--font-rounded), system-ui, sans-serif" },
  { id: "display", name: "Loud", css: "var(--font-display), Impact, sans-serif" },
] as const;

export const SHAPES = [
  { id: "rounded", name: "Rounded" },
  { id: "pill", name: "Pill" },
  { id: "square", name: "Square" },
  { id: "outline", name: "Outline" },
] as const;

const HEX = /^#[0-9a-f]{6}$/i;

/** Validate untrusted form input into a Style object. */
export function parseStyle(input: Record<string, unknown>): Style {
  const pick = (k: string) => (typeof input[k] === "string" && HEX.test(input[k] as string) ? (input[k] as string) : undefined);
  const font = FONTS.find((f) => f.id === input.font)?.id;
  const shape = SHAPES.find((s) => s.id === input.shape)?.id;
  const style: Style = {};
  if (input.customColors === "on") {
    style.bg = pick("bg");
    style.text = pick("text");
    style.button = pick("button");
    style.buttonText = pick("buttonText");
  }
  if (font && font !== "sans") style.font = font;
  if (shape && shape !== "rounded") style.shape = shape;
  return style;
}

export function pageStyle(s: Style): CSSProperties {
  return {
    ...(s.bg ? { background: s.bg } : {}),
    ...(s.text ? { color: s.text } : {}),
    ...(s.font ? { fontFamily: FONTS.find((f) => f.id === s.font)?.css } : {}),
  };
}

export function buttonStyle(s: Style): CSSProperties {
  const out: CSSProperties = {};
  if (s.shape === "pill") out.borderRadius = 9999;
  if (s.shape === "square") out.borderRadius = 0;
  if (s.shape === "outline") {
    out.background = "transparent";
    out.border = `2px solid ${s.button ?? "currentColor"}`;
    out.color = s.button ?? undefined;
  } else if (s.button) {
    out.background = s.button;
    out.borderColor = s.button;
  }
  if (s.buttonText && s.shape !== "outline") out.color = s.buttonText;
  return out;
}

export const hasCustomColors = (s: Style) => Boolean(s.bg || s.text || s.button || s.buttonText);
