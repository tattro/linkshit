import { and, desc, eq, gte, isNotNull, isNull, sql } from "drizzle-orm";
import type { Metadata } from "next";
import NextLink from "next/link";
import { notFound } from "next/navigation";
import { db, events, users } from "@/db";
import { avatarUrl } from "@/components/ProfileView";
import { CREATOR_TYPES, isCreatorType } from "@/lib/creatorTypes";
import { countryName } from "@/lib/geo";
import { PLATFORMS } from "@/lib/socials";

async function getKit(raw: string) {
  const handle = decodeURIComponent(raw).replace(/^@/, "").toLowerCase();
  const [user] = await db
    .select({
      id: users.id, handle: users.handle, displayName: users.displayName, bio: users.bio, avatarVersion: users.avatarVersion,
      socials: users.socials, creatorType: users.creatorType, mediaKit: users.mediaKit, contactEnabled: users.contactEnabled,
    })
    .from(users)
    // Locked or banned pages don't get a public kit
    .where(and(eq(users.handle, handle), isNull(users.bannedAt), isNull(users.lockCode), isNotNull(users.mediaKit)));
  return user ?? null;
}

export async function generateMetadata({ params }: { params: Promise<{ handle: string }> }): Promise<Metadata> {
  const user = await getKit((await params).handle);
  if (!user) return { title: "Not found" };
  const name = user.displayName || `@${user.handle}`;
  return { title: `${name}: media kit`, description: `Reach, rates and real stats for ${name}.` };
}

const thirtyDaysAgo = () => new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

const fmt = (n: number) => (n >= 10_000 ? `${(n / 1000).toFixed(n >= 100_000 ? 0 : 1)}K` : n.toLocaleString("en-US"));

export default async function MediaKitPage({ params }: { params: Promise<{ handle: string }> }) {
  const user = await getKit((await params).handle);
  if (!user || !user.mediaKit) notFound();
  const kit = user.mediaKit;
  const inRange = and(eq(events.userId, user.id), gte(events.createdAt, thirtyDaysAgo()));
  const [totals, countries, sources] = await Promise.all([
    db.select({ kind: events.kind, n: sql<number>`count(*)::int` }).from(events).where(inRange).groupBy(events.kind),
    db.select({ label: events.country, n: sql<number>`count(*)::int` }).from(events)
      .where(and(inRange, eq(events.kind, "view"), isNotNull(events.country))).groupBy(events.country).orderBy(desc(sql`count(*)`)).limit(3),
    db.select({ label: events.referrer, n: sql<number>`count(*)::int` }).from(events)
      .where(and(inRange, eq(events.kind, "view"), isNotNull(events.referrer))).groupBy(events.referrer).orderBy(desc(sql`count(*)`)).limit(3),
  ]);
  const views = totals.find((t) => t.kind === "view")?.n ?? 0;
  const clicks = totals.find((t) => t.kind === "click")?.n ?? 0;
  const name = user.displayName || `@${user.handle}`;
  const avatar = avatarUrl(user);
  const niche = isCreatorType(user.creatorType) && user.creatorType !== "other" ? CREATOR_TYPES[user.creatorType].label : null;
  const socials = PLATFORMS.filter((p) => p.id !== "email" && user.socials[p.id]);

  return (
    <div className="min-h-screen bg-stone-100 px-5 py-10 text-stone-900">
      <main className="mx-auto max-w-xl space-y-5">
        <header className="flex items-center gap-4">
          {avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatar} alt="" className="h-20 w-20 rounded-full object-cover" />
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-stone-300 text-3xl font-black uppercase">{user.handle[0]}</div>
          )}
          <div className="min-w-0">
            <p className="font-mono text-xs uppercase tracking-widest text-stone-500">Media kit</p>
            <h1 className="truncate text-3xl font-black tracking-tight">{name}</h1>
            <p className="text-sm text-stone-600">{niche && <span className="mr-2">{niche}</span>}<NextLink href={`/${user.handle}`} className="font-mono underline">linksh.it/{user.handle}</NextLink></p>
          </div>
        </header>

        {user.bio && <p className="whitespace-pre-wrap text-stone-700">{user.bio}</p>}

        {kit.reach && (
          <section className="rounded-2xl border-2 border-stone-900 bg-white p-4">
            <h2 className="text-xs font-bold uppercase tracking-widest text-stone-500">Reach</h2>
            <p className="mt-1 whitespace-pre-wrap text-lg font-semibold">{kit.reach}</p>
          </section>
        )}

        <section className="rounded-2xl border-2 border-stone-900 bg-white p-4">
          <h2 className="text-xs font-bold uppercase tracking-widest text-stone-500">Bio link, last 30 days</h2>
          <div className="mt-2 grid grid-cols-3 gap-2 text-center">
            <div><p className="text-2xl font-black tabular-nums">{fmt(views)}</p><p className="text-xs text-stone-500">page views</p></div>
            <div><p className="text-2xl font-black tabular-nums">{fmt(clicks)}</p><p className="text-xs text-stone-500">link clicks</p></div>
            <div><p className="text-2xl font-black tabular-nums">{views ? `${Math.round((clicks / views) * 100)}%` : "–"}</p><p className="text-xs text-stone-500">click rate</p></div>
          </div>
          {(countries.length > 0 || sources.length > 0) && (
            <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
              {countries.length > 0 && <div><dt className="text-stone-500">Top countries</dt><dd className="font-semibold">{countries.map((c) => countryName(c.label!)).join(", ")}</dd></div>}
              {sources.length > 0 && <div><dt className="text-stone-500">Visitors come from</dt><dd className="font-semibold">{sources.map((s) => s.label).join(", ")}</dd></div>}
            </dl>
          )}
          <p className="mt-3 text-xs text-stone-400">✓ Counted by linksh.it, not typed in by the creator.</p>
        </section>

        {kit.rates && (
          <section className="rounded-2xl border-2 border-stone-900 bg-white p-4">
            <h2 className="text-xs font-bold uppercase tracking-widest text-stone-500">Rates</h2>
            <p className="mt-1 whitespace-pre-wrap">{kit.rates}</p>
          </section>
        )}

        {socials.length > 0 && (
          <nav aria-label="Social accounts" className="flex flex-wrap gap-2">
            {socials.map((p) => (
              <a key={p.id} href={user.socials[p.id]} target="_blank" rel="noopener noreferrer nofollow" className="flex items-center gap-1.5 rounded-full border-2 border-stone-900 bg-white px-3 py-1.5 text-sm font-semibold">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden><path d={p.path} /></svg>
                {p.label}
              </a>
            ))}
          </nav>
        )}

        <NextLink href={`/${user.handle}`} className="block rounded-2xl bg-stone-900 py-4 text-center font-bold text-white">
          {user.contactEnabled ? "Work with me: message me on my page" : "See my page"}
        </NextLink>

        <p className="pt-4 text-center font-mono text-xs text-stone-400"><NextLink href="/" className="underline">made with linksh.it</NextLink></p>
      </main>
    </div>
  );
}

export const instant = false;
