import { Logo } from "./Logo";

export function AuthShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-stone-100 px-6 text-stone-900">
      <Logo className="mb-8 text-2xl" />
      <div className="w-full max-w-sm rounded-2xl border-2 border-stone-900 bg-white p-8 shadow-[6px_6px_0_0_#1c1917]">
        <h1 className="mb-6 text-2xl font-black">{title}</h1>
        {children}
      </div>
    </main>
  );
}

export const inputCls =
  "w-full rounded-xl border-2 border-stone-900 bg-white px-4 py-3 outline-none focus:ring-4 focus:ring-lime-300";
export const buttonCls =
  "w-full rounded-xl bg-stone-900 py-3 font-bold text-white hover:bg-lime-500 hover:text-stone-900 disabled:opacity-50";
