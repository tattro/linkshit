import Link from "next/link";

/** Shown at linksh.it/<handle> while a new account hasn't confirmed its email. */
export function NotLiveYet({ handle }: { handle: string }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-stone-100 px-6 text-center text-stone-900">
      <p aria-hidden className="select-none text-8xl leading-none">🚽</p>
      <h1 className="mt-6 text-3xl font-black tracking-tight md:text-4xl">linksh.it/{handle} is still warming up.</h1>
      <p className="mt-3 max-w-md text-stone-600">
        This page goes live as soon as its owner confirms their email. Check back soon.
      </p>
      <p className="mt-6 text-sm text-stone-500">
        Is this yours? <Link href="/dashboard" className="font-semibold text-stone-900 underline">Open your dashboard</Link> and hit the link in your inbox.
      </p>
    </main>
  );
}
