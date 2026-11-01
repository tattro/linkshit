import {
  Pacifico, Permanent_Marker, Press_Start_2P, Bebas_Neue, Playfair_Display, Space_Grotesk, Caveat, Lobster, Abril_Fatface, Comic_Neue, Orbitron, Creepster, Righteous, Fredoka, Special_Elite, Bangers, Cinzel, VT323, Rubik_Mono_One, Shrikhand,
} from "next/font/google";

// Extra profile fonts. Declared once here so their CSS is available everywhere;
// browsers only download a font file when a page actually uses it.
const f_beach = Pacifico({ variable: "--font-beach", weight: '400', subsets: ["latin"], preload: false, display: "swap" });
const f_marker = Permanent_Marker({ variable: "--font-marker", weight: '400', subsets: ["latin"], preload: false, display: "swap" });
const f_pixel = Press_Start_2P({ variable: "--font-pixel", weight: '400', subsets: ["latin"], preload: false, display: "swap" });
const f_poster = Bebas_Neue({ variable: "--font-poster", weight: '400', subsets: ["latin"], preload: false, display: "swap" });
const f_magazine = Playfair_Display({ variable: "--font-magazine", subsets: ["latin"], preload: false, display: "swap" });
const f_techy = Space_Grotesk({ variable: "--font-techy", subsets: ["latin"], preload: false, display: "swap" });
const f_handwritten = Caveat({ variable: "--font-handwritten", subsets: ["latin"], preload: false, display: "swap" });
const f_diner = Lobster({ variable: "--font-diner", weight: '400', subsets: ["latin"], preload: false, display: "swap" });
const f_headline = Abril_Fatface({ variable: "--font-headline", weight: '400', subsets: ["latin"], preload: false, display: "swap" });
const f_comic = Comic_Neue({ variable: "--font-comic", weight: ['400', '700'], subsets: ["latin"], preload: false, display: "swap" });
const f_scifi = Orbitron({ variable: "--font-scifi", subsets: ["latin"], preload: false, display: "swap" });
const f_spooky = Creepster({ variable: "--font-spooky", weight: '400', subsets: ["latin"], preload: false, display: "swap" });
const f_retro = Righteous({ variable: "--font-retro", weight: '400', subsets: ["latin"], preload: false, display: "swap" });
const f_bubbly = Fredoka({ variable: "--font-bubbly", subsets: ["latin"], preload: false, display: "swap" });
const f_typewriter = Special_Elite({ variable: "--font-typewriter", weight: '400', subsets: ["latin"], preload: false, display: "swap" });
const f_comicbook = Bangers({ variable: "--font-comicbook", weight: '400', subsets: ["latin"], preload: false, display: "swap" });
const f_royal = Cinzel({ variable: "--font-royal", subsets: ["latin"], preload: false, display: "swap" });
const f_terminal = VT323({ variable: "--font-terminal", weight: '400', subsets: ["latin"], preload: false, display: "swap" });
const f_chunky = Rubik_Mono_One({ variable: "--font-chunky", weight: '400', subsets: ["latin"], preload: false, display: "swap" });
const f_groovy = Shrikhand({ variable: "--font-groovy", weight: '400', subsets: ["latin"], preload: false, display: "swap" });

export const extraFontVariables = [f_beach, f_marker, f_pixel, f_poster, f_magazine, f_techy, f_handwritten, f_diner, f_headline, f_comic, f_scifi, f_spooky, f_retro, f_bubbly, f_typewriter, f_comicbook, f_royal, f_terminal, f_chunky, f_groovy].map((f) => f.variable).join(" ");
