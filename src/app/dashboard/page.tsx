import { and, asc, desc, eq, isNull } from "drizzle-orm";
import { db, events, links, messages, questions, subscribers } from "@/db";
import { answeredQuestions } from "@/lib/profile";
import { sql } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import Link from "next/link";
import { SetupHide } from "./SetupHide";
import { CreatorTypePicker } from "./CreatorTypePicker";
import { categoryIdeas, CREATOR_TYPES, isCreatorType, suggestedGrow } from "@/lib/creatorTypes";
import { siteUrl } from "@/lib/request";
import { PLATFORMS } from "@/lib/socials";
import { avatarUrl, backgroundUrl, offersLast, visibleLinks } from "@/components/ProfileView";
import { LivePreview } from "./LivePreview";
import { PreviewDock } from "./PreviewDock";
import { DomainForm } from "./DomainForm";
import { domainsEnabled, isApex } from "@/lib/domains";
import { DashboardHeader } from "./DashboardHeader";
import { LinkList } from "./LinkList";
import { AdultGateForm, MediaKitForm, PageLockForm, RedirectForm, SeoForm, TrackingForm } from "./extras";
import { QR_REFERRER, qrTarget } from "@/lib/qr";
import { AccountSettings, BackupForm, ContactSettings, QASettings, AddLinkForm, AdvertiserOptIn, AvatarForm, BackgroundForm, DeleteAccountForm, DeletePageForm, Graveyard, HandleForm, LinktreeImport, SignupSettings, StealLook, TipsForm, LookForm, ProfileForm, ShareCard, SocialsForm, VerifyBanner } from "./editor";

export const metadata = { title: "Dashboard" };

function Section({ title, children, aside, id, toggle }: {
  title: string;
  children: React.ReactNode;
  aside?: React.ReactNode;
  id?: string;
  /** A feature you switch on or off: shows On/Off and folds away while it's off. */
  toggle?: { on: boolean; blurb: string; suggested?: boolean };
}) {
  if (toggle) {
    return (
      <details id={id} open={toggle.on} className="group scroll-mt-24 rounded-2xl border-2 border-stone-900 bg-white">
        <summary className="flex cursor-pointer list-none items-center gap-3 p-5 [&::-webkit-details-marker]:hidden">
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-black">{title}</h2>
            <p className="text-sm text-stone-500">{toggle.blurb}</p>
          </div>
          {toggle.suggested && !toggle.on && (
            <span className="shrink-0 rounded-full bg-sky-100 px-2.5 py-1 text-xs font-bold text-sky-800">Suggested</span>
          )}
          <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${toggle.on ? "bg-lime-300 text-stone-900" : "bg-stone-200 text-stone-600"}`}>
            {toggle.on ? "On" : "Off"}
          </span>
          <span aria-hidden className="shrink-0 text-stone-400 transition group-open:rotate-180">▾</span>
        </summary>
        <div className="border-t-2 border-stone-100 p-5">{children}</div>
      </details>
    );
  }
  return (
    <section id={id} className="scroll-mt-24 rounded-2xl border-2 border-stone-900 bg-white p-6">
      <div className="mb-4 flex items-baseline justify-between gap-4">
        <h2 className="text-lg font-black">{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

const TABS = [
  { id: "page", label: "✏️ My page" },
  { id: "look", label: "🎨 Look" },
  { id: "grow", label: "🚀 Grow" },
  { id: "settings", label: "⚙️ Settings" },
] as const;
type Tab = (typeof TABS)[number]["id"];

function Tabs({ active, badges }: { active: Tab; badges: Partial<Record<Tab, number>> }) {
  return (
    <nav aria-label="Dashboard sections" className="sticky top-0 z-20 -mx-6 bg-stone-100/95 px-6 py-2 backdrop-blur">
      <ul className="grid grid-cols-4 gap-1 rounded-2xl border-2 border-stone-900 bg-white p-1">
        {TABS.map((t) => (
          <li key={t.id}>
            <Link
              href={t.id === "page" ? "/dashboard" : `/dashboard?tab=${t.id}`}
              aria-current={active === t.id ? "page" : undefined}
              className={`relative block rounded-xl px-1 py-2 text-center text-xs font-bold sm:text-sm ${active === t.id ? "bg-stone-900 text-white" : "text-stone-600 hover:bg-stone-100"}`}
            >
              {t.label}
              {!!badges[t.id] && (
                <span className="absolute -right-1 -top-1 rounded-full bg-red-500 px-1.5 text-[10px] leading-4 text-white">{badges[t.id]}</span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function SetupChecklist({ steps, askType }: { steps: { label: string; done: boolean; href: string }[]; askType: boolean }) {
  const left = steps.filter((x) => !x.done).length;
  return (
    <section className="rounded-2xl border-2 border-stone-900 bg-lime-200 p-5">
      {askType && (
        <div className="mb-5 border-b-2 border-stone-900/10 pb-5">
          <CreatorTypePicker />
        </div>
      )}
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="text-lg font-black">Get started</h2>
        <span className="text-sm font-semibold">{steps.length - left} of {steps.length} done</span>
      </div>
      <ol className="space-y-2">
        {steps.map((x, i) => (
          <li key={x.label}>
            <a href={x.href} className={`flex items-center gap-3 rounded-xl bg-white px-3 py-2.5 text-sm font-semibold ${x.done ? "text-stone-400" : "hover:ring-2 hover:ring-stone-900"}`}>
              <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs ${x.done ? "bg-lime-400 text-stone-900" : "border-2 border-stone-900"}`}>
                {x.done ? "✓" : i + 1}
              </span>
              <span className={`min-w-0 flex-1 ${x.done ? "line-through" : ""}`}>{x.label}</span>
              {!x.done && <span aria-hidden>→</span>}
            </a>
          </li>
        ))}
      </ol>
      <div className="mt-3 text-right"><SetupHide /></div>
    </section>
  );
}

export default async function Dashboard({ searchParams }: PageProps<"/dashboard">) {
  const s = await getSession();
  if (!s) redirect("/login");
  const { account, page: user } = s;
  const extraPage = user.id !== account.id;
  const { welcome, verified, reset, newpage, pagegone, tab: rawTab } = await searchParams;
  const tab: Tab = TABS.some((t) => t.id === rawTab) ? (rawTab as Tab) : "page";
  const allRows = await db
    .select()
    .from(links)
    .where(eq(links.userId, user.id))
    .orderBy(asc(links.position), asc(links.id));
  const rows = allRows.filter((l) => !l.deletedAt);
  const graves = allRows.filter((l) => l.deletedAt).sort((a, b) => +b.deletedAt! - +a.deletedAt!);
  const totalClicks = rows.reduce((n, l) => n + l.clicks, 0);
  const [{ subs }] = await db.select({ subs: sql<number>`count(*)::int` }).from(subscribers).where(eq(subscribers.userId, user.id));
  const inbox = await db.select({ id: messages.id, name: messages.name, email: messages.email, body: messages.body, createdAt: messages.createdAt })
    .from(messages).where(eq(messages.userId, user.id)).orderBy(desc(messages.createdAt)).limit(20);
  const waiting = await db.select({ id: questions.id, body: questions.body, createdAt: questions.createdAt })
    .from(questions).where(and(eq(questions.userId, user.id), isNull(questions.answeredAt))).orderBy(desc(questions.createdAt)).limit(50);
  const answered = await answeredQuestions(user.id);
  const recentSubs = await db.select({ email: subscribers.email, createdAt: subscribers.createdAt }).from(subscribers)
    .where(eq(subscribers.userId, user.id)).orderBy(desc(subscribers.createdAt)).limit(5);
  const pageUrl = `${await siteUrl()}/${user.handle}`;
  const [{ scans }] = await db.select({ scans: sql<number>`count(*)::int` }).from(events)
    .where(and(eq(events.userId, user.id), eq(events.kind, "view"), eq(events.referrer, QR_REFERRER)));
  const [{ views }] = await db.select({ views: sql<number>`count(*)::int` }).from(events)
    .where(and(eq(events.userId, user.id), eq(events.kind, "view")));
  const realLinks = rows.filter((l) => !l.heading && !l.offerId).length;
  const steps = [
    { label: "Add your photo", done: user.avatarVersion > 0, href: "/dashboard#profile" },
    { label: "Write a short bio", done: user.bio.trim() !== "", href: "/dashboard#profile" },
    { label: isCreatorType(user.creatorType) ? CREATOR_TYPES[user.creatorType].firstLinks : "Add 3 links", done: realLinks >= 3, href: "/dashboard#add-link" },
    { label: "Pick a look", done: user.theme !== "classic" || Object.keys(user.style ?? {}).length > 0, href: "/dashboard?tab=look" },
    { label: "Share your page", done: views > 0, href: "/dashboard?tab=grow#share" },
  ];
  const showSetup = steps.some((x) => !x.done) && (await cookies()).get("setup_hidden")?.value !== "1";
  const growBadge = waiting.length;
  const suggested = suggestedGrow(user.creatorType);
  const niche = isCreatorType(user.creatorType) ? CREATOR_TYPES[user.creatorType] : null;
  const platforms = PLATFORMS.map(({ id, label, path, placeholder }) => ({ id, label, path, placeholder }));

  return (
    <div className="min-h-screen bg-stone-100 text-stone-900">
      <DashboardHeader active="editor" />

      <main className="mx-auto grid max-w-6xl gap-8 px-6 py-8 lg:grid-cols-[1fr_360px]">
        <div className="min-w-0 space-y-8">
          {welcome && (
            <div className="rounded-2xl border-2 border-stone-900 bg-lime-300 p-5">
              <p className="font-bold">linksh.it/{user.handle} is officially yours. 🎉</p>
              <p className="text-sm">Add a photo and some links below, then paste that URL into every bio you own.</p>
            </div>
          )}
          {verified && <div className="rounded-2xl border-2 border-stone-900 bg-lime-300 p-4 font-bold">Email confirmed. You&apos;re legit. ✅</div>}
          {reset && <div className="rounded-2xl border-2 border-stone-900 bg-lime-300 p-4 font-bold">New password saved and you&apos;re back in. Try not to forget this one. 🧻</div>}
          {newpage && (
            <div className="rounded-2xl border-2 border-stone-900 bg-lime-300 p-5">
              <p className="font-bold">New page, who dis? linksh.it/{user.handle} is live. 🎉</p>
              <p className="text-sm">Same login, totally separate links and look. Switch pages any time from the 📄 menu up top.</p>
            </div>
          )}
          {pagegone && <div className="rounded-2xl border-2 border-stone-900 bg-lime-300 p-4 font-bold">Page flushed. You&apos;re back on your main page. 🧻</div>}
          {extraPage && (
            <div className="rounded-2xl border-2 border-dashed border-stone-400 bg-white p-3 text-sm text-stone-600">
              Editing <span className="font-mono font-semibold text-stone-900">linksh.it/{user.handle}</span>, one of your extra pages.
            </div>
          )}
          {!account.emailVerifiedAt && !verified && <VerifyBanner email={account.email ?? ""} />}

          <Tabs active={tab} badges={{ grow: growBadge }} />

          {tab === "page" && (
            <>
              {showSetup && <SetupChecklist steps={steps} askType={user.creatorType === ""} />}

              <Section id="add-link" title="Add a link">
                {niche?.tip && realLinks < 3 && (
                  <p className="-mt-1 mb-4 rounded-xl bg-sky-50 px-3 py-2 text-sm text-sky-900">
                    <span className="font-bold">{niche.label.split(" ")[0]} Tip:</span> {niche.tip}
                  </p>
                )}
                <AddLinkForm
                  sections={rows.filter((l) => l.heading).map((l) => ({ id: l.id, title: l.title }))}
                  ideas={categoryIdeas(user.creatorType)}
                  linkPlaceholder={niche?.linkPlaceholder}
                  defaultCategory={realLinks < 3 && niche && user.creatorType !== "other" ? niche.categories[0] : ""}
                  adultDefault={user.creatorType === "adult"}
                  musician={["musician", "artist", "other"].includes(user.creatorType)}
                />
                {realLinks < 3 && <LinktreeImport />}
              </Section>

              <Section
                title="Your links"
                aside={<span className="text-sm text-stone-500">{totalClicks} total click{totalClicks === 1 ? "" : "s"}</span>}
              >
                {rows.length === 0 ? (
                  <p className="text-stone-500">No links yet. Your page is looking pretty empty.</p>
                ) : (
                  <LinkList links={rows} />
                )}
                <Graveyard links={graves} />
              </Section>

              <Section id="profile" title="Photo, name & bio">
                <div className="space-y-6">
                  <AvatarForm current={avatarUrl(user)} initial={(user.displayName || user.handle).slice(0, 1)} />
                  <ProfileForm user={{ displayName: user.displayName, bio: user.bio, statsEmail: account.weeklyEmail ? account.statsEvery : "off" }} />
                </div>
              </Section>

              <Section title="Social icons">
                <p className="-mt-2 mb-4 text-sm text-stone-500">These show as a row of icons under your bio. Usernames or links both work.</p>
                <SocialsForm socials={user.socials} platforms={platforms} />
              </Section>
            </>
          )}

          {tab === "look" && (
            <Section title="Look & feel">
              <div className="space-y-6">
                <StealLook />
                <BackgroundForm current={backgroundUrl(user)} />
                <LookForm key={JSON.stringify([user.theme, user.style])} user={{ theme: user.theme, style: user.style, openInApp: user.openInApp }} avatar={avatarUrl(user)} background={backgroundUrl(user)} />
              </div>
            </Section>
          )}

          {tab === "grow" && (
            <>
              <Section id="share" title="Share your page">
                <ShareCard url={pageUrl} qrUrl={qrTarget(pageUrl)} avatar={avatarUrl(user)} scans={scans} />
              </Section>

              <p className="px-1 text-sm text-stone-500">Extras for your page. Turn on only what you need. Tap one to open it.</p>

              <Section title="💬 Anonymous Q&A" toggle={{ on: user.qaEnabled, suggested: suggested.includes("qa"), blurb: waiting.length ? `${waiting.length} question${waiting.length === 1 ? "" : "s"} waiting for you` : "Visitors ask you anything; you pick what to answer." }}>
                <QASettings enabled={user.qaEnabled} prompt={user.qaPrompt} waiting={waiting} answered={answered} />
              </Section>

              <Section title="📬 Email list" toggle={{ on: user.signupEnabled, suggested: suggested.includes("signup"), blurb: subs ? `${subs} subscriber${subs === 1 ? "" : "s"} so far` : "Collect emails from visitors, download them any time." }}>
                <p className="mb-4 text-sm text-stone-500">Visitors leave their email on your page and it&apos;s saved here. Download the list and import it into Mailchimp, Substack or whatever you send from.</p>
                <SignupSettings enabled={user.signupEnabled} prompt={user.signupPrompt} count={subs} recent={recentSubs} />
              </Section>

              <Section title="✉️ Contact form" toggle={{ on: user.contactEnabled, suggested: suggested.includes("contact"), blurb: inbox.length ? `${inbox.length} message${inbox.length === 1 ? "" : "s"} in your inbox` : "A Message me button. Your email stays private." }}>
                <ContactSettings enabled={user.contactEnabled} messages={inbox} />
              </Section>

              <Section title="💸 Tip jar" toggle={{ on: Object.values(user.tips ?? {}).some(Boolean), suggested: suggested.includes("tips"), blurb: "Let fans tip you. Money goes straight to you." }}>
                <TipsForm tips={user.tips} />
              </Section>

              <Section title="📊 Media kit" toggle={{ on: Boolean(user.mediaKit), suggested: suggested.includes("kit"), blurb: "A page for brands with your reach, rates and real stats." }}>
                <MediaKitForm kit={user.mediaKit} url={`${pageUrl}/kit`} />
              </Section>

              <Section title="🤝 Make money" toggle={{ on: Boolean(account.marketplaceInterestAt), blurb: "Get paid to feature brands you like." }}>
                <AdvertiserOptIn optedIn={Boolean(account.marketplaceInterestAt)} />
              </Section>
            </>
          )}

          {tab === "settings" && (
            <>
              <Section title="What do you do?">
                <p className="-mt-2 mb-4 text-sm text-stone-500">Changes which categories and extras we suggest. Everything stays available whatever you pick.</p>
                <CreatorTypePicker current={user.creatorType} compact />
              </Section>

              <Section title="Page address">
                <HandleForm handle={user.handle} />
              </Section>

              {domainsEnabled() && (
                <Section title="Custom domain" toggle={{ on: Boolean(user.customDomain), blurb: `Use your own domain instead of linksh.it/${user.handle}.` }}>
                  <DomainForm current={user.customDomain} enabled={domainsEnabled()} apex={user.customDomain ? isApex(user.customDomain) : false} />
                </Section>
              )}

              <Section title="🛠️ Power tools" toggle={{ on: Boolean(user.redirectLinkId || user.lockCode || user.adultGate || user.seoTitle || user.seoDescription || user.metaPixel || user.googleAnalytics || user.tiktokPixel), blurb: "Redirect, 18+ page, page lock, Google preview, tracking pixels." }}>
                <div className="space-y-6 [&>*+*]:border-t [&>*+*]:border-stone-200 [&>*+*]:pt-6">
                  <RedirectForm links={rows.filter((l) => !l.offerId && !l.heading).map((l) => ({ id: l.id, title: l.title }))} current={user.redirectLinkId} />
                  <AdultGateForm on={user.adultGate} />
                  <PageLockForm code={user.lockCode} />
                  <SeoForm title={user.seoTitle} description={user.seoDescription} />
                  <TrackingForm metaPixel={user.metaPixel} googleAnalytics={user.googleAnalytics} tiktokPixel={user.tiktokPixel} utm={user.utm} />
                </div>
              </Section>

              <Section title="Import & backup">
                <div className="space-y-6">
                  <LinktreeImport />
                  <BackupForm />
                </div>
              </Section>

              <Section title="Account">
                <p className="-mt-2 mb-4 text-sm text-stone-500">Your login, shared by all your pages.</p>
                <AccountSettings email={account.email ?? ""} />
              </Section>

              <Section title="Danger zone">
                {extraPage ? <DeletePageForm handle={user.handle} /> : <DeleteAccountForm handle={user.handle} />}
              </Section>
            </>
          )}
        </div>

        <PreviewDock>
          <div data-chaos-bounds data-keep-colors className="mx-auto h-[640px] w-full max-w-[340px] overflow-y-auto rounded-[2.5rem] border-8 border-stone-900 shadow-xl [&>div]:min-h-full">
            <LivePreview
              user={{
                id: user.id, handle: user.handle, displayName: user.displayName, bio: user.bio, theme: user.theme,
                avatarVersion: user.avatarVersion, bgVersion: user.bgVersion, style: user.style, socials: user.socials,
                tips: user.tips, signupEnabled: user.signupEnabled, signupPrompt: user.signupPrompt, contactEnabled: user.contactEnabled, qaEnabled: user.qaEnabled, qaPrompt: user.qaPrompt,
              }}
              links={offersLast(visibleLinks(rows)).map((l) => ({ ...l, locked: Boolean(l.lockCode) }))}
              qa={answered}
            />
          </div>
        </PreviewDock>
      </main>
    </div>
  );
}

// Every request depends on the session or the database, so render on demand.
export const instant = false;
