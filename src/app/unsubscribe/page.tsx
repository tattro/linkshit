import Link from "next/link";
import { unsubscribeWeekly } from "@/app/actions/unsubscribe";

export const metadata = { title: "Unsubscribe · linksh.it", robots: { index: false } };

export default async function Unsubscribe({ searchParams }: PageProps<"/unsubscribe">) {
  const { u, t, done, bad } = await searchParams;
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-stone-100 px-6 text-center text-stone-900">
      <p aria-hidden className="text-7xl">{done ? "🫡" : "📭"}</p>
      {done ? (
        <>
          <h1 className="mt-4 text-3xl font-black">You&apos;re out. No more stats emails.</h1>
          <p className="mt-2 text-stone-600">Changed your mind? Flip it back on in your dashboard.</p>
        </>
      ) : bad || !u || !t ? (
        <>
          <h1 className="mt-4 text-3xl font-black">That link looks broken.</h1>
          <p className="mt-2 text-stone-600">Log in and set &quot;Email me my stats&quot; to Never in your dashboard instead.</p>
        </>
      ) : (
        <form action={unsubscribeWeekly} className="mt-4">
          <h1 className="text-3xl font-black">Stop the stats emails?</h1>
          <input type="hidden" name="u" value={String(u)} />
          <input type="hidden" name="t" value={String(t)} />
          <button className="mt-6 rounded-full bg-stone-900 px-8 py-4 font-bold text-white hover:bg-lime-500 hover:text-stone-900">
            Yes, unsubscribe me
          </button>
        </form>
      )}
      <Link href="/dashboard" className="mt-6 font-bold text-stone-600 hover:text-stone-900">Go to dashboard</Link>
    </div>
  );
}

export const instant = false;
