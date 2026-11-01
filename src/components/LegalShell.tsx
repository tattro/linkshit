import Link from "next/link";
import { Logo } from "./Logo";
import { SiteFooter } from "./SiteFooter";

export function LegalShell({ title, updated, children }: { title: string; updated?: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-stone-100 text-stone-900">
      <header className="mx-auto flex w-full max-w-3xl items-center justify-between p-6">
        <Link href="/"><Logo /></Link>
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 pb-20">
        <article className="rounded-3xl border border-stone-200 bg-white p-8 shadow-sm md:p-12">
          <h1 className="text-4xl font-black tracking-tight">{title}</h1>
          {updated && <p className="mt-2 text-sm text-stone-500">Last updated {updated}</p>}
          <div className="legal mt-8 space-y-4 leading-relaxed text-stone-700 [&_a]:font-semibold [&_a]:text-stone-900 [&_a]:underline [&_a]:decoration-lime-400 [&_a]:decoration-2 [&_a]:underline-offset-2 [&_h2]:mt-10 [&_h2]:text-xl [&_h2]:font-black [&_h2]:text-stone-900 [&_li]:ml-5 [&_li]:list-disc [&_ul]:space-y-1">
            {children}
          </div>
        </article>
      </main>
      <SiteFooter />
    </div>
  );
}
