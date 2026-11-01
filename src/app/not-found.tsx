import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-stone-100 px-6 text-center text-stone-900">
      <p aria-hidden className="select-none text-[10rem] leading-none md:text-[14rem]">💩</p>
      <h1 className="mt-6 text-4xl font-black tracking-tight md:text-5xl">Sorry, but this shit is broken.</h1>
      <p className="mt-3 max-w-md text-stone-600">
        Whatever you were looking for isn&apos;t here. It might be an unclaimed handle, which means it could be yours.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href="/signup" className="rounded-full bg-stone-900 px-8 py-4 font-bold text-white hover:bg-lime-500 hover:text-stone-900">
          Sign up for linksh.it
        </Link>
        <Link href="/" className="rounded-full px-6 py-4 font-bold text-stone-600 hover:text-stone-900">
          Take me home
        </Link>
      </div>
    </div>
  );
}
