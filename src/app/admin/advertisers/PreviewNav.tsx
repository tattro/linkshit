"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  ["/admin/advertisers", "How it works"],
  ["/admin/advertisers/signup", "1. Sign up"],
  ["/admin/advertisers/creators", "2. Find creators"],
  ["/admin/advertisers/offer", "3. Create offer"],
  ["/admin/advertisers/dashboard", "4. Results"],
] as const;

export function PreviewNav() {
  const path = usePathname();
  return (
    <nav aria-label="Advertiser preview" className="overflow-x-auto border-b-2 border-stone-200 bg-white">
      <div className="mx-auto flex max-w-5xl gap-1 px-4 py-2 sm:px-6">
        {TABS.map(([href, label]) => (
          <Link
            key={href}
            href={href}
            className={`whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-semibold ${path === href ? "bg-stone-900 text-white" : "hover:bg-stone-100"}`}
          >
            {label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
