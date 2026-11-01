import type { Metadata } from "next";
import { Bricolage_Grotesque, DM_Serif_Display, Geist, Geist_Mono, Nunito } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
// Profile page fonts: only downloaded by pages that use them
const serif = DM_Serif_Display({ variable: "--font-serif", weight: "400", subsets: ["latin"], preload: false });
const rounded = Nunito({ variable: "--font-rounded", subsets: ["latin"], preload: false });
const display = Bricolage_Grotesque({ variable: "--font-display", subsets: ["latin"], preload: false });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://linksh.it"),
  title: { default: "linksh.it — all your links, one shitty URL", template: "%s · linksh.it" },
  description: "Claim linksh.it/yourname and put every link you've got in one place.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} ${serif.variable} ${rounded.variable} ${display.variable} antialiased`}>{children}</body>
    </html>
  );
}
