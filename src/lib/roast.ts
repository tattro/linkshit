import "server-only";
import { and, eq, gte, sql } from "drizzle-orm";
import { db, events, type Link, type User } from "@/db";
import { QR_REFERRER } from "@/lib/qr";

/**
 * "Roast my linksh.it": pre-written roasts (no AI), each with a way to fix it.
 * Lines come from Jade's playbook. `rank` is how useful the fix is: lower shows first.
 */
export type Roast = { id: number; roast: string; fix: string; href: string; rank: number };

const DAY = 24 * 60 * 60 * 1000;
const EMOJI = /\p{Extended_Pictographic}/u;
const LINK_IN_BIO_HOSTS = ["linktr.ee", "beacons.ai", "lnk.bio", "linkin.bio", "campsite.bio", "bio.link", "solo.to", "stan.store", "hoo.be", "msha.ke", "tap.bio", "allmylinks.com", "koji.to"];

const LINKS = "/dashboard#links";
const PROFILE = "/dashboard#profile";
const SOCIALS = "/dashboard#socials";
const LOOK = "/dashboard?tab=look#look";
const SHARE = "/dashboard?tab=grow#share";
const CONTACT = "/dashboard?tab=grow#contact";
const POWER = "/dashboard?tab=settings#power";
const ADDRESS = "/dashboard?tab=settings#address";

const host = (url: string) => {
  try { return new URL(url).hostname.replace(/^www\./, "").toLowerCase(); } catch { return ""; }
};

function hexLum(hex: string): number | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const c = [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16) / 255).map((x) => (x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
function contrast(a?: string, b?: string): number | null {
  if (!a || !b) return null;
  const x = hexLum(a), y = hexLum(b);
  if (x === null || y === null) return null;
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

/** Everything that matches this page, sorted most useful first (ties are shuffled by the caller). */
export async function roastPage(user: User, rows: Link[], graves: Link[], accountCreatedAt: Date): Promise<Roast[]> {
  const now = Date.now();
  const since30 = new Date(now - 30 * DAY);
  const since7 = new Date(now - 7 * DAY);
  const age = now - +accountCreatedAt;

  const [stats] = await db.select({
    views30: sql<number>`count(*) filter (where ${events.kind} = 'view')::int`,
    clicks30: sql<number>`count(*) filter (where ${events.kind} = 'click')::int`,
    views7: sql<number>`count(*) filter (where ${events.kind} = 'view' and ${events.createdAt} >= ${since7.toISOString()}::timestamptz)::int`,
  }).from(events).where(and(eq(events.userId, user.id), gte(events.createdAt, since30)));
  const [{ scans }] = await db.select({ scans: sql<number>`count(*)::int` }).from(events)
    .where(and(eq(events.userId, user.id), eq(events.kind, "view"), eq(events.referrer, QR_REFERRER)));
  const perLink = await db.select({ linkId: events.linkId, n: sql<number>`count(*)::int` }).from(events)
    .where(and(eq(events.userId, user.id), eq(events.kind, "click"), gte(events.createdAt, since30)))
    .groupBy(events.linkId);
  const sources = await db.select({ ref: events.referrer, n: sql<number>`count(*)::int` }).from(events)
    .where(and(eq(events.userId, user.id), eq(events.kind, "view"), gte(events.createdAt, since30)))
    .groupBy(events.referrer);

  const clicksOf = new Map(perLink.map((r) => [r.linkId, r.n]));
  const links = rows.filter((l) => !l.heading && !l.offerId);
  const headings = rows.filter((l) => l.heading);
  const n = links.length;
  const out: Roast[] = [];
  const add = (id: number, rank: number, roast: string, fix: string, href: string) => out.push({ id, rank, roast, fix, href });

  // ---- Links ----
  if (n === 0) add(1, 0, "A link-in-bio with no links. Very zen. Very useless.", "Add the one place you most want fans to go, like your latest song or video.", "/dashboard#add-link");
  if (n === 1) add(2, 2, "One link. You could have just put that in your bio.", "Add your socials and a second link, or turn on redirect mode to send everyone straight to that one.", LINKS);
  if (n >= 12 && n <= 24) add(3, 1, `${n} links. Nobody has ever needed ${n} links.`, "Keep your top 5 to 7. Flush the rest. You can bring them back from the graveyard any time.", LINKS);
  if (n >= 25) add(4, 1, "This isn't a link-in-bio. It's a phone book.", "Group links under section headings like Music, Merch and Socials so people find things fast.", LINKS);
  if (n >= 8 && headings.length === 0) add(5, 2, `${n} links and zero headings. Your fans are lost in the woods.`, "Add a couple of section headings to split your links into groups.", LINKS);
  if (stats.views30 >= 20) {
    const dead = links.find((l) => now - +l.createdAt > 30 * DAY && !clicksOf.get(l.id));
    if (dead) add(6, 2, `'${dead.title}' got 0 clicks this month. It's not shy. It's dead.`, "Flush it, or rename it so people know why they should tap it.", LINKS);
  }
  if (links.some((l) => /^(https?:\/\/|www\.)|^[\w-]+\.[a-z]{2,}(\/|$)/i.test(l.title.trim()))) add(7, 1, "Your button just says the URL. Did a robot set this up?", "Name it what it is, like \"New single\" or \"Book a call\".", LINKS);
  const shouty = links.find((l) => (l.title.match(/\p{L}/gu) ?? []).length >= 4 && l.title === l.title.toUpperCase() && l.title !== l.title.toLowerCase());
  if (shouty) add(8, 3, `WHY IS '${shouty.title}' YELLING AT ME.`, "Use normal capitals. If you want it to stand out, turn on Spotlight instead.", LINKS);
  if (links.some((l) => /^(click here|click|link|here|tap here|my link)$/i.test(l.title.trim()))) add(9, 1, "'Click here' to what? My heart? Be specific.", "Say what people get: \"Watch the video\", \"Get 20% off\".", LINKS);
  const urls = links.map((l) => l.url.replace(/\/+$/, "").toLowerCase());
  if (new Set(urls).size < urls.length) add(10, 2, "You linked the same thing twice. We heard you the first time.", "Delete the copy. One clear button gets more clicks than two.", LINKS);
  const spot = links.filter((l) => l.spotlight);
  if (spot.length >= 3) add(11, 2, "When everything wiggles, nothing wiggles.", "Spotlight just one link, the one you care about most right now.", LINKS);
  const totalLinkClicks = links.reduce((s, l) => s + (clicksOf.get(l.id) ?? 0), 0);
  if (n >= 3 && totalLinkClicks >= 10) {
    const min = Math.min(...links.map((l) => clicksOf.get(l.id) ?? 0));
    const sad = spot.find((l) => (clicksOf.get(l.id) ?? 0) === min);
    if (sad) add(12, 2, `You made '${sad.title}' wiggle and it still gets no clicks. Rough.`, "Move the Spotlight to your most-clicked link, or give this one a better title and thumbnail.", LINKS);
    const best = links.reduce((a, b) => ((clicksOf.get(b.id) ?? 0) > (clicksOf.get(a.id) ?? 0) ? b : a));
    const at = links.indexOf(best);
    if (at >= 3) add(13, 1, `Your best link is buried at #${at + 1}. Promote the kid.`, `Drag '${best.title}' to the top. Most visitors only tap the first few.`, LINKS);
  }
  if (links.some((l) => host(l.url).endsWith("soundcloud.com"))) add(14, 4, "A SoundCloud link. In this economy?", "Add Spotify and Apple Music too, and turn on the embed so fans can play it right on your page.", LINKS);
  if (links.some((l) => l.title.length > 60)) add(15, 2, "That button is a paragraph. It's a button, not a memoir.", "Keep button titles under 30 characters. Put the details on the page you link to.", LINKS);
  const decorated = (l: Link) => Boolean(l.icon) || l.thumbVersion > 0 || EMOJI.test(l.title);
  if (n >= 3 && !links.some(decorated)) add(16, 3, "A wall of identical beige buttons. Riveting.", "Add a thumbnail or emoji to your top links so the eye has somewhere to land.", LINKS);
  if (n >= 3 && links.every((l) => EMOJI.test(l.title))) add(17, 4, "An emoji on every link. It's giving 2016 Instagram caption.", "Keep emojis on 2 or 3 key links so those stand out.", LINKS);
  if (graves.filter((l) => !l.offerId).length >= 10) add(18, 4, "Your link graveyard has more residents than your page.", "Delete the ones you'll never bring back. It's a graveyard, not storage.", LINKS);
  if (links.some((l) => LINK_IN_BIO_HOSTS.some((h) => host(l.url) === h || host(l.url).endsWith(`.${h}`)))) add(19, 1, "You linked to another link-in-bio. Link-ception. Stop.", "Import those links here so everything lives on one page.", "/dashboard?tab=settings");
  if (user.creatorType === "musician" && n > 0 && !links.some((l) => l.embed || l.music)) add(20, 1, "You make music and there's nothing to play. Bold strategy.", "Paste your Spotify song link and tick \"This is music\" so fans can listen without leaving.", LINKS);

  // ---- Profile ----
  const socialCount = Object.values(user.socials ?? {}).filter(Boolean).length;
  const bio = user.bio.trim();
  if (!user.avatarVersion) add(21, 0, "No profile photo. Mysterious. Or in witness protection.", "Add a photo of your face or logo. People trust pages with a face.", PROFILE);
  if (!bio) add(22, 1, "No bio. Let the people guess, I guess.", "Write one line: who you are and what you make.", PROFILE);
  else if (!/[\p{L}\p{N}]/u.test(bio)) add(23, 2, "Your bio is just emojis. Bold. Unreadable, but bold.", "Keep an emoji, but add a few words about what you do.", PROFILE);
  if (bio.length > 150) add(24, 3, "Your bio is longer than some of my relationships.", "Cut it to one or two short sentences. Nobody reads past the first line.", PROFILE);
  if (/links? (are )?below|check (out )?(my )?links|👇/i.test(bio)) add(25, 3, "'Links below.' Yes. We can see them.", "Use that space to say who you are or what's new.", PROFILE);
  if (!user.displayName.trim() || user.displayName.trim().toLowerCase() === user.handle) add(26, 2, "Your name is just your handle again. We get it.", "Use your real name or stage name so it reads like a person.", PROFILE);
  if (/\d{3,}$/.test(user.handle)) add(27, 4, `${user.handle}? Were the first 999 taken?`, "Try a cleaner handle in Settings. Your old one keeps redirecting for a while.", ADDRESS);
  if (socialCount === 0) add(28, 1, "No socials. Are you even online?", "Add your main 2 or 3 socials as icons at the top.", SOCIALS);
  if (socialCount >= 10) add(29, 3, `${socialCount} socials. Including Snapchat? Commit to something.`, "Keep the 4 or 5 where you actually post.", SOCIALS);
  if (!user.contactEnabled && !user.signupEnabled && socialCount === 0) add(30, 2, "No way for fans to reach you. Playing hard to get?", "Turn on Message me so fans and brands can reach you without seeing your email.", CONTACT);
  if (!user.verifiedBy) add(31, 5, "Not even verified by your mom? Ouch.", "Tick \"Get your profile verified\". It takes 3 seconds and you pick who verified you.", PROFILE);

  // ---- Look ----
  const s = user.style ?? {};
  if (user.theme === "classic" && !s.bg && !s.button && !s.text && !s.font) add(33, 2, "Default theme, default colors. How unique of you.", "Pick a theme below, or tap \"🎨 Steal colours from my photo\" for matching colors in one click.", LOOK);
  else if (!s.font || s.font === "sans") add(34, 4, "Default font. Bold of you to have no personality.", "Pick a font that matches your vibe. There are 20+.", LOOK);
  const textC = contrast(s.text, s.bg);
  if (textC !== null && textC < 3) add(35, 1, "Your text is basically invisible. Readable is a vibe too.", "Make the text much lighter or darker than the background.", LOOK);
  if (user.bgVersion > 0 && !s.bgTint) add(36, 2, "Text on a busy photo with no tint. Good luck, readers.", "Turn on a dark or light tint so your text stays readable.", LOOK);
  if (s.font === "spooky") add(37, 4, "Creepster. Is this a link-in-bio or a haunted house?", "Love it for Halloween. The rest of the year, try an easier font so people can read your links.", LOOK);
  if (s.font === "beach") add(38, 4, "Pacifico. Opening a beach bar?", "Script fonts are hard to read on small buttons. Check your page on your phone.", LOOK);
  if (s.font === "comicbook") add(39, 4, "Bangers. Every word is a shout. Calm down.", "For something just as bold but easier to read, try Poster.", LOOK);
  if (s.chaos) add(40, 3, "Chaos mode is on. Respect. Your visitors are in danger.", "Fun for a day. If clicks drop, turn it off when you have something important to share.", LOOK);
  if (user.theme === "brown") add(41, 6, "The Number Two theme. You understood the assignment.", "Nothing to fix. Make sure your links are as good as your taste.", LINKS);
  if (s.shape === "square") add(42, 5, "Square buttons. Very serious. Very spreadsheet.", "Try pill or rounded buttons for a friendlier look.", LOOK);
  const btnC = contrast(s.button, s.bg);
  if (btnC !== null && btnC < 1.3 && s.shape !== "outline") add(43, 2, "Your buttons are camouflaged. Are they hiding from us?", "Give buttons a color that pops against the background.", LOOK);
  const white = (h?: string) => (hexLum(h ?? "") ?? 0) > 0.9;
  if (white(s.bg) && white(s.button) && !s.bg2) add(44, 3, "White on white on white. Your eyes have filed a complaint.", "Try Midnight, or add a gradient background.", LOOK);

  // ---- Stats ----
  if (age > 7 * DAY && stats.views7 === 0) add(45, 1, "Zero views this week. Even your mom stopped checking.", "Put your linksh.it link in every social bio and download your QR code for shows or merch.", SHARE);
  if (stats.views30 >= 50 && stats.clicks30 / stats.views30 < 0.05) add(46, 1, "People show up, look around and leave. Like an open house with bad carpet.", "Put your best link first and Spotlight it. Fewer links usually means more clicks.", LINKS);
  if (age > 14 * DAY && scans === 0) add(47, 5, "Your QR code has never seen daylight.", "Download it and put it on merch, flyers, or your screen at shows.", SHARE);
  const known = sources.filter((r) => r.ref);
  const totalViews = sources.reduce((a, r) => a + r.n, 0);
  const top = known.sort((a, b) => b.n - a.n)[0];
  if (totalViews >= 30 && top && top.n / totalViews >= 0.9) add(48, 4, `Everyone comes from ${top.ref}. Other apps exist, they don't bite.`, "Add your link to your other socials' bios to reach new people.", SHARE);

  // ---- Sharing ----
  if (!user.seoTitle && !user.seoDescription) add(49, 5, "No preview text. Your link shows up in group chats looking naked.", "Add a title and description so your link looks good when shared.", POWER);
  const newest = rows.reduce((m, l) => Math.max(m, +l.createdAt), 0);
  if (newest && now - newest > 60 * DAY) {
    const days = Math.floor((now - newest) / DAY);
    add(50, 2, `You haven't added anything in ${days} days. It's collecting dust.`, "Swap in your newest thing at the top. Fresh pages get more clicks.", LINKS);
  }

  return out.sort((a, b) => a.rank - b.rank);
}

export const NOTHING_TO_ROAST = "We looked. We couldn't find anything. Honestly annoying.";
