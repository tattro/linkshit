import type { CSSProperties } from "react";
import type { Style } from "@/db/schema";

export const FONTS = [
  { id: "sans", name: "Clean", css: "var(--font-geist-sans), system-ui, sans-serif" },
  { id: "serif", name: "Fancy", css: "var(--font-serif), Georgia, serif" },
  { id: "mono", name: "Hacker", css: "var(--font-geist-mono), ui-monospace, monospace" },
  { id: "rounded", name: "Friendly", css: "var(--font-rounded), system-ui, sans-serif" },
  { id: "display", name: "Loud", css: "var(--font-display), Impact, sans-serif" },
  { id: "beach", name: "Beach", css: "var(--font-beach), cursive", more: true },
  { id: "marker", name: "Marker", css: "var(--font-marker), cursive", more: true },
  { id: "pixel", name: "8-bit", css: "var(--font-pixel), system-ui, sans-serif", more: true },
  { id: "poster", name: "Poster", css: "var(--font-poster), system-ui, sans-serif", more: true },
  { id: "magazine", name: "Magazine", css: "var(--font-magazine), system-ui, sans-serif", more: true },
  { id: "techy", name: "Techy", css: "var(--font-techy), system-ui, sans-serif", more: true },
  { id: "handwritten", name: "Handwritten", css: "var(--font-handwritten), cursive", more: true },
  { id: "diner", name: "Diner", css: "var(--font-diner), cursive", more: true },
  { id: "headline", name: "Headline", css: "var(--font-headline), system-ui, sans-serif", more: true },
  { id: "comic", name: "Comic Sans-ish", css: "var(--font-comic), system-ui, sans-serif", more: true },
  { id: "scifi", name: "Sci-fi", css: "var(--font-scifi), system-ui, sans-serif", more: true },
  { id: "spooky", name: "Spooky", css: "var(--font-spooky), cursive", more: true },
  { id: "retro", name: "Retro", css: "var(--font-retro), system-ui, sans-serif", more: true },
  { id: "bubbly", name: "Bubbly", css: "var(--font-bubbly), system-ui, sans-serif", more: true },
  { id: "typewriter", name: "Typewriter", css: "var(--font-typewriter), system-ui, sans-serif", more: true },
  { id: "comicbook", name: "Comic book", css: "var(--font-comicbook), system-ui, sans-serif", more: true },
  { id: "royal", name: "Royal", css: "var(--font-royal), system-ui, sans-serif", more: true },
  { id: "terminal", name: "Terminal", css: "var(--font-terminal), system-ui, sans-serif", more: true },
  { id: "chunky", name: "Chunky", css: "var(--font-chunky), system-ui, sans-serif", more: true },
  { id: "groovy", name: "Groovy", css: "var(--font-groovy), cursive", more: true },
] as { id: string; name: string; css: string; more?: boolean }[];

export const SHAPES = [
  { id: "rounded", name: "Rounded" },
  { id: "pill", name: "Pill" },
  { id: "square", name: "Square" },
  { id: "outline", name: "Outline" },
] as const;

export const GRADIENT_DIRS = [
  { id: "down", name: "↓", label: "Top to bottom", css: "linear-gradient(180deg, A, B)" },
  { id: "diag", name: "↘", label: "Diagonal", css: "linear-gradient(135deg, A, B)" },
  { id: "right", name: "→", label: "Left to right", css: "linear-gradient(90deg, A, B)" },
  { id: "radial", name: "◎", label: "From the centre", css: "radial-gradient(circle at 50% 30%, A, B)" },
] as const;

/** Quick-pick gradients: [from, to, direction]. */
export const GRADIENT_PRESETS = [
  { name: "Sunset", bg: "#ff7e5f", bg2: "#7b2ff7", dir: "down", text: "#ffffff" },
  { name: "Toxic", bg: "#0f2027", bg2: "#a3e635", dir: "down", text: "#ffffff" },
  { name: "Cotton candy", bg: "#fbc2eb", bg2: "#a6c1ee", dir: "diag", text: "#1c1917" },
  { name: "Ocean", bg: "#2193b0", bg2: "#0b1d3a", dir: "down", text: "#ffffff" },
  { name: "Peach", bg: "#ffecd2", bg2: "#fcb69f", dir: "diag", text: "#1c1917" },
  { name: "Brown note", bg: "#f5e6c8", bg2: "#6b3f1d", dir: "radial", text: "#1c1917" },
] as const;

export function gradientCss(a: string, b: string, dir: string = "down") {
  const d = GRADIENT_DIRS.find((x) => x.id === dir) ?? GRADIENT_DIRS[0];
  return d.css.replace("A", a).replace("B", b);
}

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
    if (input.bgMode === "gradient" && style.bg) {
      style.bg2 = pick("bg2");
      const dir = GRADIENT_DIRS.find((d) => d.id === input.bgDir)?.id;
      if (style.bg2 && dir && dir !== "down") style.bgDir = dir;
    }
  }
  if (font && font !== "sans") style.font = font;
  if (shape && shape !== "rounded") style.shape = shape;
  if (input.chaos === "on") style.chaos = true;
  if (input.bgTint === "dark" || input.bgTint === "light") style.bgTint = input.bgTint;
  return style;
}

export function pageStyle(s: Style): CSSProperties {
  return {
    ...(s.bg ? { backgroundColor: s.bg } : {}),
    ...(s.bg && s.bg2 ? { backgroundImage: gradientCss(s.bg, s.bg2, s.bgDir) } : {}),
    ...(s.text ? { color: s.text } : {}),
    ...(s.font ? { fontFamily: FONTS.find((f) => f.id === s.font)?.css } : {}),
  };
}

/** Background photo layer, with an optional tint so text stays readable. */
export function backgroundImageStyle(url: string | null, s: Style): CSSProperties {
  if (!url) return {};
  const wash = s.bgTint === "dark" ? "rgba(0,0,0,.45)" : s.bgTint === "light" ? "rgba(255,255,255,.55)" : null;
  return {
    backgroundImage: wash ? `linear-gradient(${wash}, ${wash}), url("${url}")` : `url("${url}")`,
    backgroundSize: "cover",
    backgroundPosition: "center",
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
