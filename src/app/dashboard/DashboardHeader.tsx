import Link from "next/link";
import { logout } from "@/app/actions/auth";
import { Logo } from "@/components/Logo";

export function DashboardHeader({ handle, active, admin }: { handle: string; active: "editor" | "analytics" | "admin"; admin: boolean }) {
  const tab = (key: typeof active) =>
    `rounded-full px-3 py-1.5 font-semibold ${active === key ? "bg-stone-900 text-white" : "text-stone-600 hover:bg-stone-100"}`;
  return (
    <header className="border-b-2 border-stone-900 bg-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-4">
        <div className="flex items-center gap-6">
          <Logo />
          <nav className="flex gap-1 text-sm">
            <Link href="/dashboard" className={tab("editor")}>Editor</Link>
            <Link href="/dashboard/analytics" className={tab("analytics")}>Analytics</Link>
            {admin && <Link href="/admin" className={tab("admin")}>Admin</Link>}
          </nav>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <a href={`/${handle}`} target="_blank" className="font-mono font-semibold underline decoration-lime-500 decoration-2 underline-offset-4">
            linksh.it/{handle} ↗
          </a>
          <form action={logout}>
            <button className="text-stone-500 hover:text-stone-900">Log out</button>
          </form>
        </div>
      </div>
    </header>
  );
}
