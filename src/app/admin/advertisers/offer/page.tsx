import { requireAdmin } from "@/lib/auth";
import { getCreators, NICHES, nicheLabel } from "../data";
import { OfferBuilder } from "./OfferBuilder";

export default async function OfferPage() {
  await requireAdmin();
  const creators = (await getCreators()).map((c) => ({ niche: c.niche, countries: c.countries, clicks30: c.clicks30, adult: c.adult }));
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-black">Create an offer</h1>
        <p className="text-sm text-stone-600">Set who can promote it and what you pay per sale. You only pay when a sale is confirmed.</p>
      </div>
      <OfferBuilder creators={creators} niches={NICHES.map((n) => [n, nicheLabel(n)])} />
    </div>
  );
}

export const instant = false;
