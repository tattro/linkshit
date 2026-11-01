import { eq } from "drizzle-orm";
import { ImageResponse } from "next/og";
import { db, users } from "@/db";
import { getTheme } from "@/lib/themes";

export const alt = "linksh.it profile";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Solid colours per theme; ImageResponse can't use Tailwind classes
const PALETTE: Record<string, { bg: string; fg: string; accent: string }> = {
  classic: { bg: "#f5f5f4", fg: "#1c1917", accent: "#84cc16" },
  midnight: { bg: "#020617", fg: "#f1f5f9", accent: "#6366f1" },
  toxic: { bg: "#000000", fg: "#bef264", accent: "#a3e635" },
  sunset: { bg: "#ec4899", fg: "#ffffff", accent: "#fdba74" },
  brown: { bg: "#fef3c7", fg: "#451a03", accent: "#92400e" },
};

export default async function Image({ params }: { params: Promise<{ handle: string }> }) {
  const handle = decodeURIComponent((await params).handle).toLowerCase();
  const [user] = await db
    .select({ handle: users.handle, displayName: users.displayName, bio: users.bio, theme: users.theme, style: users.style, bannedAt: users.bannedAt })
    .from(users)
    .where(eq(users.handle, handle));
  const ok = user && !user.bannedAt;
  const p = PALETTE[getTheme(user?.theme).id] ?? PALETTE.classic;
  const bg = (ok && user.style.bg) || p.bg;
  const fg = (ok && user.style.text) || p.fg;
  const name = ok ? user.displayName || user.handle : "linksh.it";

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "center", padding: 80, background: bg, color: fg }}>
        <div style={{ display: "flex", alignItems: "center", gap: 40 }}>
          <div style={{ width: 160, height: 160, borderRadius: 80, background: p.accent, color: "#000", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 88, fontWeight: 900 }}>
            {name.slice(0, 1).toUpperCase()}
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 72, fontWeight: 900, lineHeight: 1.1 }}>{name.slice(0, 28)}</div>
            <div style={{ fontSize: 40, opacity: 0.7 }}>{`linksh.it/${ok ? user.handle : ""}`}</div>
          </div>
        </div>
        {ok && user.bio && <div style={{ marginTop: 48, fontSize: 36, opacity: 0.85, maxWidth: 1000 }}>{user.bio.slice(0, 140)}</div>}
        <div style={{ position: "absolute", bottom: 48, right: 80, fontSize: 32, fontWeight: 700, display: "flex" }}>
          linksh<span style={{ color: p.accent }}>.</span>it
        </div>
      </div>
    ),
    size,
  );
}
