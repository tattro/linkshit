import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-stone-100 px-6 text-center text-stone-900">
      <p className="text-7xl">🧻</p>
      <h1 className="mt-4 text-3xl font-black">Nobody&apos;s here.</h1>
      <p className="mt-2 text-stone-600">This handle is unclaimed, or it got flushed.</p>
      <Link href="/signup" className="mt-6 rounded-full bg-stone-900 px-6 py-3 font-bold text-white hover:bg-lime-500 hover:text-stone-900">
        Claim a handle
      </Link>
    </div>
  );
}
