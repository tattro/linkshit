import { DashboardHeader } from "@/app/dashboard/DashboardHeader";
import { requireAdmin } from "@/lib/auth";
import { PreviewNav } from "./PreviewNav";

export const metadata = { title: "Advertiser preview", robots: { index: false } };

// ADVERTISER PREVIEW: admin-only. Not linked anywhere public, no real money moves.
export default async function AdvertiserPreviewLayout({ children }: LayoutProps<"/admin/advertisers">) {
  await requireAdmin();
  return (
    <div className="min-h-screen bg-stone-100 text-stone-900">
      <DashboardHeader active="admin" />
      <div className="bg-amber-300 px-4 py-2 text-center text-sm font-bold">
        🚧 Preview only. Advertisers can&apos;t see this yet, and nothing here charges or pays anyone. Sample creators are marked.
      </div>
      <PreviewNav />
      <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6">{children}</main>
    </div>
  );
}

export const instant = false;
