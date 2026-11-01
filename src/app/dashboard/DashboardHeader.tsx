import Link from "next/link";
import { logout } from "@/app/actions/auth";
import { Logo } from "@/components/Logo";
import { accountPages, getSession, isAdmin } from "@/lib/auth";
import { PageSwitcher } from "./PageSwitcher";

export async function DashboardHeader({ active }: { active: "editor" | "analytics" | "marketplace" | "admin" }) {
  const s = await getSession();
  if (!s) return null;
  const { account, page } = s;
  const pages = await accountPages(account.id);
  const tab = (key: typeof active) =>
    `rounded-full px-3 py-1.5 font-semibold ${active === key ? "bg-stone-900 text-white" : "text-stone-600 hover:bg-stone-100"}`;
  return (
    <header className="border-b-2 border-stone-900 bg-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-4">
        <div className="flex min-w-0 flex-wrap items-center gap-x-6 gap-y-2">
          <Logo />
          <nav className="flex flex-wrap gap-1 text-sm">
            <Link href="/dashboard" className={tab("editor")}>Editor</Link>
            <Link href="/dashboard/analytics" className={tab("analytics")}>Analytics</Link>
            <Link href="/dashboard/marketplace" className={`${tab("marketplace")} whitespace-nowrap`}>
              Marketplace
            </Link>
            {isAdmin(account) && <Link href="/admin" className={tab("admin")}>Admin</Link>}
          </nav>
        </div>
        <div className="flex min-w-0 items-center gap-4 text-sm">
          <PageSwitcher pages={pages} activeId={page.id} to={active === "analytics" ? "analytics" : "editor"} />
          <a href={`/${page.handle}`} target="_blank" className="min-w-0 truncate font-mono font-semibold underline decoration-lime-500 decoration-2 underline-offset-4">
            linksh.it/{page.handle} ↗
          </a>
          <form action={logout}>
            <button className="whitespace-nowrap text-stone-500 hover:text-stone-900">Log out</button>
          </form>
        </div>
      </div>
    </header>
  );
}
