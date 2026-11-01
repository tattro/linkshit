import Link from "next/link";
import { redirect } from "next/navigation";
import { Logo } from "@/components/Logo";
import { getCurrentUser } from "@/lib/auth";
import { HandleInput } from "@/components/HandleInput";
import { SiteFooter } from "@/components/SiteFooter";

async function claim(formData: FormData) {
  "use server";
  const handle = String(formData.get("handle") ?? "");
  redirect(`/signup?handle=${encodeURIComponent(handle)}`);
}

const REASONS: [string, boolean][] = [
  ["Better name than linktr.ee", true],
  ["Impress your friends", true],
  ["Show the world you actually are funny", true],
  ["Free. Like, actually free", true],
  ["Steals the colours right off your selfie", true],
  ["Opens Instagram in the app, not that cursed in-app browser", true],
  ["Has a theme called \u201cNumber Two\u201d", true],
  ["Roasts you when you forget your password", true],
  ["Italian domain, which is basically luxury", true],
  ["Makes your mom ask \u201cwait, what\u2019s the link?\u201d twice", true],
  ["Analytics proving nobody clicked your SoundCloud", true],
  ["Name you can say at Thanksgiving", false],
];

export default async function Home({ searchParams }: PageProps<"/">) {
  const user = await getCurrentUser();
  const { bye } = await searchParams;
  return (
    <div className="min-h-screen bg-stone-100 text-stone-900">
      <header className="mx-auto flex max-w-5xl items-center justify-between p-6">
        <Logo />
        <nav className="flex gap-3 text-sm font-medium">
          {user ? (
            <Link href="/dashboard" className="rounded-full bg-stone-900 px-4 py-2 text-white">Dashboard</Link>
          ) : (
            <>
              <Link href="/login" className="px-4 py-2">Log in</Link>
              <Link href="/signup" className="rounded-full bg-stone-900 px-4 py-2 text-white">Sign up</Link>
            </>
          )}
        </nav>
      </header>

      {bye && (
        <p role="status" className="mx-auto max-w-5xl px-6">
          <span className="inline-block rounded-full bg-stone-900 px-4 py-2 text-sm font-semibold text-white">Account flushed. Bye 👋💩</span>
        </p>
      )}
      <main className="mx-auto grid max-w-5xl items-center gap-12 px-6 pb-24 pt-10 md:grid-cols-2">
        <section>
          <h1 className="text-5xl font-black leading-[1.05] tracking-tight md:text-6xl">
            All your sh.it.<br />
            <span className="bg-lime-300 px-2">One link.</span>
          </h1>
          <p className="mt-6 max-w-md text-lg text-stone-600">
            Your socials, your shop, your mixtape, that one blog post. Stick it all on one page and drop
            a single link in your bio.
          </p>
          <form action={claim} className="mt-8 max-w-md space-y-2">
            <HandleInput />
            <button className="w-full rounded-xl bg-stone-900 py-3 font-bold text-white hover:bg-lime-500 hover:text-stone-900">
              Claim my linksh.it
            </button>
          </form>
        </section>

        <section aria-hidden className="mx-auto w-full max-w-xs rotate-2 rounded-[2.5rem] border-8 border-stone-900 bg-black p-6 text-lime-300 shadow-2xl">
          <div className="mx-auto h-20 w-20 rounded-full bg-lime-400" />
          <p className="mt-4 text-center font-bold">@dumpsterfire</p>
          <p className="text-center text-sm text-lime-600">making things, breaking things</p>
          <div className="mt-6 space-y-3">
            {["My podcast (lol)", "Merch nobody asked for", "Instagram", "Venmo me for coffee"].map((t) => (
              <div key={t} className="rounded-lg border-2 border-lime-300 bg-lime-400 py-3 text-center text-sm font-bold text-black">
                {t}
              </div>
            ))}
          </div>
        </section>
      </main>

      <section className="border-t border-stone-200 bg-white px-6 py-24">
        <div className="mx-auto max-w-2xl">
          <p className="text-center text-sm font-bold uppercase tracking-widest text-lime-600">The science is in</p>
          <h2 className="mt-3 text-center text-4xl font-black tracking-tight md:text-5xl">
            Why you should <span className="bg-lime-300 px-2">linksh.it</span>
          </h2>
          <ul className="mt-12 divide-y divide-stone-100 overflow-hidden rounded-3xl border border-stone-200 bg-stone-50 shadow-sm">
            {REASONS.map(([text, yes]) => (
              <li key={text} className="flex items-center gap-4 px-6 py-4">
                <span
                  aria-hidden
                  className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-black ${
                    yes ? "bg-lime-300 text-stone-900" : "bg-red-100 text-red-600"
                  }`}
                >
                  {yes ? "\u2713" : "\u2715"}
                </span>
                <span className={`text-base md:text-lg ${yes ? "font-semibold" : "font-semibold text-stone-400 line-through decoration-red-400 decoration-2"}`}>
                  <span className="sr-only">{yes ? "Yes: " : "No: "}</span>
                  {text}
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-12 text-center">
            <Link
              href={user ? "/dashboard" : "/signup"}
              className="inline-block rounded-full bg-stone-900 px-8 py-4 font-bold text-white hover:bg-lime-500 hover:text-stone-900"
            >
              {user ? "Go to your dashboard" : "Fine, I\u2019ll claim mine"}
            </Link>
          </div>
        </div>
      </section>

      <SiteFooter creator />
    </div>
  );
}

// Every request depends on the session or the database, so render on demand.
export const instant = false;
