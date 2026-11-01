import { asc, eq } from "drizzle-orm";
import QRCode from "qrcode";
import { db, links, subscribers } from "@/db";
import { sql } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { siteUrl } from "@/lib/request";
import { PLATFORMS } from "@/lib/socials";
import { avatarUrl, backgroundUrl, liveLinks } from "@/components/ProfileView";
import { LivePreview } from "./LivePreview";
import { PreviewDock } from "./PreviewDock";
import { DomainForm } from "./DomainForm";
import { domainsEnabled, isApex } from "@/lib/domains";
import { DashboardHeader } from "./DashboardHeader";
import { LinkList } from "./LinkList";
import { AddLinkForm, AvatarForm, BackgroundForm, DeleteAccountForm, DeletePageForm, Graveyard, HandleForm, LinktreeImport, SignupSettings, TipsForm, LookForm, ProfileForm, ShareCard, SocialsForm, VerifyBanner } from "./editor";

export const metadata = { title: "Dashboard" };

function Section({ title, children, aside }: { title: string; children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <section className="rounded-2xl border-2 border-stone-900 bg-white p-6">
      <div className="mb-4 flex items-baseline justify-between gap-4">
        <h2 className="text-lg font-black">{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

export default async function Dashboard({ searchParams }: PageProps<"/dashboard">) {
  const s = await getSession();
  if (!s) redirect("/login");
  const { account, page: user } = s;
  const extraPage = user.id !== account.id;
  const { welcome, verified, reset, newpage, pagegone } = await searchParams;
  const allRows = await db
    .select()
    .from(links)
    .where(eq(links.userId, user.id))
    .orderBy(asc(links.position), asc(links.id));
  const rows = allRows.filter((l) => !l.deletedAt);
  const graves = allRows.filter((l) => l.deletedAt).sort((a, b) => +b.deletedAt! - +a.deletedAt!);
  const totalClicks = rows.reduce((n, l) => n + l.clicks, 0);
  const [{ subs }] = await db.select({ subs: sql<number>`count(*)::int` }).from(subscribers).where(eq(subscribers.userId, user.id));
  const pageUrl = `${await siteUrl()}/${user.handle}`;
  const qrSvg = await QRCode.toString(pageUrl, { type: "svg", margin: 1, color: { dark: "#1c1917", light: "#ffffff" } });
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

          <Section title="Add a link">
            <AddLinkForm />
            <LinktreeImport />
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

          <Section title="Profile">
            <div className="space-y-6">
              <AvatarForm current={avatarUrl(user)} initial={(user.displayName || user.handle).slice(0, 1)} />
              <HandleForm handle={user.handle} />
              <ProfileForm user={{ displayName: user.displayName, bio: user.bio, statsEmail: account.weeklyEmail ? account.statsEvery : "off" }} />
            </div>
          </Section>

          <Section title="Social icons">
            <p className="-mt-2 mb-4 text-sm text-stone-500">These show as a row of icons under your bio. Usernames or links both work.</p>
            <SocialsForm socials={user.socials} platforms={platforms} />
          </Section>

          <Section title="Tip jar">
            <p className="-mt-2 mb-4 text-sm text-stone-500">Adds a 💸 Tip jar button to your page. Fill in any you use. Money goes straight to you.</p>
            <TipsForm tips={user.tips} />
          </Section>

          <Section title="Email list">
            <p className="-mt-2 mb-4 text-sm text-stone-500">Let visitors leave their email. Download the list any time and import it into Mailchimp, Substack, or whatever.</p>
            <SignupSettings enabled={user.signupEnabled} prompt={user.signupPrompt} count={subs} />
          </Section>

          <Section title="Look & feel">
            <div className="space-y-6">
              <BackgroundForm current={backgroundUrl(user)} />
              <LookForm user={{ theme: user.theme, style: user.style, openInApp: user.openInApp }} avatar={avatarUrl(user)} background={backgroundUrl(user)} />
            </div>
          </Section>

          {domainsEnabled() && (
            <Section title="Custom domain">
              <p className="-mt-2 mb-4 text-sm text-stone-500">Use your own domain instead of linksh.it/{user.handle}.</p>
              <DomainForm current={user.customDomain} enabled={domainsEnabled()} apex={user.customDomain ? isApex(user.customDomain) : false} />
            </Section>
          )}

          <Section title="Share">
            <ShareCard url={pageUrl} qrSvg={qrSvg} />
          </Section>

          <Section title="Danger zone">
            {extraPage ? <DeletePageForm handle={user.handle} /> : <DeleteAccountForm handle={user.handle} />}
          </Section>
        </div>

        <PreviewDock>
          <div data-chaos-bounds className="mx-auto h-[640px] w-full max-w-[340px] overflow-y-auto rounded-[2.5rem] border-8 border-stone-900 shadow-xl [&>div]:min-h-full">
            <LivePreview
              user={{
                id: user.id, handle: user.handle, displayName: user.displayName, bio: user.bio, theme: user.theme,
                avatarVersion: user.avatarVersion, bgVersion: user.bgVersion, style: user.style, socials: user.socials,
                tips: user.tips, signupEnabled: user.signupEnabled, signupPrompt: user.signupPrompt,
              }}
              links={liveLinks(rows)}
            />
          </div>
        </PreviewDock>
      </main>
    </div>
  );
}

// Every request depends on the session or the database, so render on demand.
export const instant = false;
