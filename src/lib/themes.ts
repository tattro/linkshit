export type Theme = {
  id: string;
  name: string;
  page: string; // classes for the page background + text
  button: string; // classes for each link button
  muted: string; // classes for secondary text
};

export const THEMES: Theme[] = [
  {
    id: "classic",
    name: "Classic",
    page: "bg-stone-100 text-stone-900",
    button: "bg-white text-stone-900 border border-stone-300 hover:bg-stone-900 hover:text-white",
    muted: "text-stone-500",
  },
  {
    id: "midnight",
    name: "Midnight",
    page: "bg-slate-950 text-slate-100",
    button: "bg-slate-800 text-slate-100 border border-slate-700 hover:bg-indigo-500 hover:border-indigo-400",
    muted: "text-slate-400",
  },
  {
    id: "toxic",
    name: "Toxic",
    page: "bg-black text-lime-300",
    button: "bg-lime-400 text-black font-bold border-2 border-lime-300 hover:bg-black hover:text-lime-300",
    muted: "text-lime-600",
  },
  {
    id: "sunset",
    name: "Sunset",
    page: "bg-gradient-to-b from-orange-300 via-pink-400 to-purple-600 text-white",
    button: "bg-white/20 backdrop-blur text-white border border-white/40 hover:bg-white hover:text-pink-600",
    muted: "text-white/80",
  },
  {
    id: "brown",
    name: "Number Two",
    page: "bg-amber-100 text-amber-950",
    button: "bg-amber-800 text-amber-50 hover:bg-amber-950 rounded-full",
    muted: "text-amber-700",
  },
];

export function getTheme(id: string | null | undefined): Theme {
  return THEMES.find((t) => t.id === id) ?? THEMES[0];
}
