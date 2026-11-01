import type { Viewport } from "next";

// iOS zooms in when you tap a text field under 16px; this stops that (pinch zoom still works).
export const viewport: Viewport = { maximumScale: 1 };

// On phones the dashboard runs a bit smaller so more fits on screen.
const phoneScale = "@media (max-width: 640px) { html { font-size: 13px; } }";

export default function DashboardLayout({ children }: LayoutProps<"/dashboard">) {
  return (
    <>
      <style>{phoneScale}</style>
      {children}
    </>
  );
}
