import { and, asc, eq, isNull } from "drizzle-orm";
import { avatars, backgrounds, db, linkThumbs, links } from "@/db";
import { getCurrentUser } from "@/lib/auth";
import type { Backup, BackupImage } from "@/lib/backup";

const img = (row?: { data: Buffer; contentType: string }): BackupImage =>
  row ? { type: row.contentType, data: Buffer.from(row.data).toString("base64") } : null;

// "Download my page": everything needed to rebuild the page, as one JSON file.
// Stats and subscribers aren't included (subscribers have their own CSV download).
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return new Response("Log in first.", { status: 401 });
  const [avatar] = await db.select().from(avatars).where(eq(avatars.userId, user.id));
  const [background] = await db.select().from(backgrounds).where(eq(backgrounds.userId, user.id));
  const rows = await db.select().from(links)
    .where(and(eq(links.userId, user.id), isNull(links.deletedAt), isNull(links.offerId)))
    .orderBy(asc(links.position), asc(links.id));
  const thumbs = new Map<number, BackupImage>();
  for (const l of rows) {
    if (l.thumbVersion > 0) {
      const [t] = await db.select().from(linkThumbs).where(eq(linkThumbs.linkId, l.id));
      thumbs.set(l.id, img(t));
    }
  }
  const backup: Backup = {
    app: "linksh.it",
    version: 1,
    exportedAt: new Date().toISOString(),
    page: {
      handle: user.handle, displayName: user.displayName, bio: user.bio, theme: user.theme,
      style: user.style, socials: user.socials as Record<string, string>, tips: user.tips as Record<string, string>,
      openInApp: user.openInApp, signupEnabled: user.signupEnabled, signupPrompt: user.signupPrompt, contactEnabled: user.contactEnabled, qaEnabled: user.qaEnabled, qaPrompt: user.qaPrompt,
      lockCode: user.lockCode, seoTitle: user.seoTitle, seoDescription: user.seoDescription,
      metaPixel: user.metaPixel, googleAnalytics: user.googleAnalytics, tiktokPixel: user.tiktokPixel, utm: user.utm,
    },
    avatar: img(avatar),
    background: img(background),
    links: rows.map((l) => ({
      title: l.title, url: l.url, heading: l.heading, embed: l.embed, sensitive: l.sensitive, spotlight: l.spotlight, featured: l.featured,
      icon: l.icon, lockCode: l.lockCode, discountCode: l.discountCode, androidUrl: l.androidUrl,
      price: l.price, music: Boolean(l.music), videoUrl: l.videoUrl, latest: Boolean(l.latest), geo: l.geo,
      startsAt: l.startsAt?.toISOString() ?? null, countdown: l.countdown, endsAt: l.endsAt?.toISOString() ?? null,
      thumb: thumbs.get(l.id) ?? null,
    })),
  };
  const day = new Date().toISOString().slice(0, 10);
  return new Response(JSON.stringify(backup, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="linksh.it-${user.handle}-${day}.json"`,
      "Cache-Control": "private, no-store",
    },
  });
}
