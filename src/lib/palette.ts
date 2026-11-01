// Client-side colour extraction from a profile photo.

type RGB = [number, number, number];

const toHex = ([r, g, b]: RGB) => `#${[r, g, b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("")}`;

function rgbToHsl([r, g, b]: RGB): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s, l];
}

function hslToRgb(h: number, s: number, l: number): RGB {
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [f(0) * 255, f(8) * 255, f(4) * 255];
}

function luminance([r, g, b]: RGB) {
  const c = [r, g, b].map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}

const contrast = (a: RGB, b: RGB) => {
  const [x, y] = [luminance(a), luminance(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
};

const BLACK: RGB = [20, 20, 20], WHITE: RGB = [255, 255, 255];
const readableOn = (bg: RGB) => (contrast(bg, BLACK) >= contrast(bg, WHITE) ? BLACK : WHITE);

export type PhotoPalette = { bg: string; text: string; button: string; buttonText: string };

export async function paletteFromImage(src: string): Promise<PhotoPalette> {
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.src = src;
  await img.decode();
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 64;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0, 64, 64);
  const data = ctx.getImageData(0, 0, 64, 64).data;

  // Bucket pixels into a coarse 4-bit-per-channel grid and average each bucket
  const buckets = new Map<number, { n: number; sum: RGB }>();
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 128) continue;
    const key = ((data[i] >> 4) << 8) | ((data[i + 1] >> 4) << 4) | (data[i + 2] >> 4);
    const b = buckets.get(key) ?? { n: 0, sum: [0, 0, 0] };
    b.n++; b.sum[0] += data[i]; b.sum[1] += data[i + 1]; b.sum[2] += data[i + 2];
    buckets.set(key, b);
  }
  const colors = [...buckets.values()]
    .map((b) => ({ n: b.n, rgb: b.sum.map((v) => v / b.n) as RGB }))
    .map((c) => ({ ...c, hsl: rgbToHsl(c.rgb) }))
    .sort((a, b) => b.n - a.n);
  if (!colors.length) throw new Error("empty image");

  const dominant = colors[0];
  const [h, s, l] = dominant.hsl;
  const dark = l < 0.5;
  const bg = hslToRgb(h, Math.min(s, dark ? 0.55 : 0.45), dark ? 0.12 : 0.93);
  const text = dark ? hslToRgb(h, 0.25, 0.94) : hslToRgb(h, 0.45, 0.12);

  // Accent: a frequent, saturated colour; ideally a different hue from the background
  const hueGap = (a: number) => Math.min(Math.abs(a - h), 360 - Math.abs(a - h));
  const accent = [...colors]
    .filter((c) => c.hsl[1] > 0.25 && c.hsl[2] > 0.15 && c.hsl[2] < 0.85)
    .sort((a, b) => b.n * b.hsl[1] * (1 + hueGap(b.hsl[0]) / 90) - a.n * a.hsl[1] * (1 + hueGap(a.hsl[0]) / 90))[0] ?? dominant;

  // Nudge the accent's lightness until the buttons stand out from the background
  const ah = accent.hsl[0];
  const as = Math.max(accent.hsl[1], 0.45);
  let al = accent.hsl[2];
  let button = hslToRgb(ah, as, al);
  for (let i = 0; i < 12 && contrast(button, bg) < 3; i++) {
    al = dark ? Math.min(0.85, al + 0.05) : Math.max(0.2, al - 0.05);
    button = hslToRgb(ah, as, al);
  }
  return { bg: toHex(bg), text: toHex(text), button: toHex(button), buttonText: toHex(readableOn(button)) };
}
