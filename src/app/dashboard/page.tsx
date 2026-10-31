import { asc, eq } from "drizzle-orm";
import { db, links } from "@/db";
import { requireUser } from "@/lib/auth";
import { logout } from "@/app/actions/auth";
import { Logo } from "@/components/Logo";
import { ProfileView } from "@/components/ProfileView";
import { AddLinkForm, LinkItem, ProfileForm } from "./editor";

export const metadata = { title: "Dashboard" };

export default async function Dashboard({ searchParams }: PageProps<"/dashboard">) {
  const user = await requireUser();
  const { welcome } = await searchParams;
  const rows = await db
    .select()
    .from(links)
    .where(eq(links.userId, user.id))
    .orderBy(asc(links.position), asc(links.id));
  const totalClicks = rows.reduce((n, l) => n + l.clicks, 0);

  return (
    <div className="min-h-screen bg-stone-100 text-stone-900">
      <header className="border-b-2 border-stone-900 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Logo />
          <div className="flex items-center gap-4 text-sm">
            <a href={`/${user.handle}`} target="_blank" className="font-mono font-semibold underline decoration-lime-500 decoration-2 underline-offset-4">
              linksh.it/{user.handle} ↗
            </a>
            <form action={logout}>
              <button className="text-stone-500 hover:text-stone-900">Log out</button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl gap-8 px-6 py-8 lg:grid-cols-[1fr_360px]">
        <div className="space-y-8">
          {welcome && (
            <div className="rounded-2xl border-2 border-stone-900 bg-lime-300 p-5">
              <p className="font-bold">linksh.it/{user.handle} is officially yours. 🎉</p>
              <p className="text-sm">Add some links below, then paste that URL into every bio you own.</p>
            </div>
          )}

          <section className="rounded-2xl border-2 border-stone-900 bg-white p-6">
            <h2 className="mb-4 text-lg font-black">Add a link</h2>
            <AddLinkForm />
          </section>

          <section className="rounded-2xl border-2 border-stone-900 bg-white p-6">
            <div className="mb-4 flex items-baseline justify-between">
              <h2 className="text-lg font-black">Your links</h2>
              <span className="text-sm text-stone-500">{totalClicks} total click{totalClicks === 1 ? "" : "s"}</span>
            </div>
            {rows.length === 0 ? (
              <p className="text-stone-500">No links yet. Your page is looking pretty empty.</p>
            ) : (
              <ul className="space-y-3">
                {rows.map((l, i) => (
                  <LinkItem key={l.id} link={l} first={i === 0} last={i === rows.length - 1} />
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-2xl border-2 border-stone-900 bg-white p-6">
            <h2 className="mb-4 text-lg font-black">Profile & look</h2>
            <ProfileForm user={{ displayName: user.displayName, bio: user.bio, theme: user.theme }} />
          </section>
        </div>

        <aside className="lg:sticky lg:top-8 lg:self-start">
          <p className="mb-2 text-center text-sm font-semibold text-stone-500">Live preview</p>
          <div className="mx-auto h-[640px] w-full max-w-[340px] overflow-y-auto rounded-[2.5rem] border-8 border-stone-900 shadow-xl [&>div]:min-h-full">
            <ProfileView user={user} links={rows} preview />
          </div>
        </aside>
      </main>
    </div>
  );
}

// Every request depends on the session or the database, so render on demand.
export const instant = false;
