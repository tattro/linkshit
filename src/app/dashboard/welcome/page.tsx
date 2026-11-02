import { redirect } from "next/navigation";
import { Logo } from "@/components/Logo";
import { getSession } from "@/lib/auth";
import { setCreatorType } from "@/app/actions/creator";
import { CREATOR_TYPES, MAIN_TYPES } from "@/lib/creatorTypes";

export const metadata = { title: "Welcome" };

/** Straight after signup: "What are you into?" Big cards, one tap, then the dashboard. */
export default async function Welcome() {
  const s = await getSession();
  if (!s) redirect("/login");
  const { page } = s;
  const types = MAIN_TYPES.map((id) => [id, CREATOR_TYPES[id]] as const);

  return (
    <div className="min-h-screen bg-stone-100 text-stone-900">
      <header className="mx-auto max-w-3xl p-6"><Logo /></header>
      <main className="mx-auto max-w-3xl px-6 pb-16">
        <p className="font-mono text-sm text-stone-500">linksh.it/{page.handle} is yours. 🎉</p>
        <h1 className="mt-2 text-4xl font-black tracking-tight">What are you into?</h1>
        <p className="mt-2 text-stone-600">Pick one and we&apos;ll set things up for you. Everything stays available, and you can change it any time.</p>

        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          {types.map(([id, t]) => {
            const [emoji, ...words] = t.label.split(" ");
            return (
              <form key={id} action={setCreatorType}>
                <input type="hidden" name="creatorType" value={id} />
                <input type="hidden" name="next" value="welcome" />
                <button className={`flex w-full items-center gap-4 rounded-2xl border-2 border-stone-900 bg-white p-4 text-left transition hover:-translate-y-0.5 hover:bg-lime-300 ${page.creatorType === id ? "ring-4 ring-lime-400" : ""}`}>
                  <span aria-hidden className="text-3xl">{emoji}</span>
                  <span className="min-w-0">
                    <span className="block font-black">{words.join(" ")}</span>
                    <span className="block text-sm text-stone-500">{t.blurb}</span>
                  </span>
                </button>
              </form>
            );
          })}
        </div>
      </main>
    </div>
  );
}

export const instant = false;
