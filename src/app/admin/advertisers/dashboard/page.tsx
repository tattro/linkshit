import { requireAdmin } from "@/lib/auth";
import { HOLD_DAYS, LINKSHIT_CUT, usd } from "../data";

const card = "rounded-2xl border-2 border-stone-900 bg-white p-4";
const PAYOUT = 40;

// Sample results for one offer, so the screen shows every state a sale can be in
const BY_CREATOR = [
  { name: "Gym Gremlin", clicks: 2140, sales: 61 },
  { name: "Broke But Cooking", clicks: 1580, sales: 34 },
  { name: "Lofi Larry", clicks: 610, sales: 12 },
  { name: "Couch Potato Pod", clicks: 290, sales: 5 },
];
type Status = "held" | "paid" | "refunded" | "rejected";
const LEDGER: { day: number; creator: string; status: Status; note?: string }[] = [
  { day: 1, creator: "Gym Gremlin", status: "held" },
  { day: 2, creator: "Broke But Cooking", status: "held" },
  { day: 4, creator: "Lofi Larry", status: "rejected", note: "Same device as the creator" },
  { day: 9, creator: "Gym Gremlin", status: "held" },
  { day: 18, creator: "Couch Potato Pod", status: "refunded", note: "Customer refunded" },
  { day: 33, creator: "Broke But Cooking", status: "paid" },
  { day: 41, creator: "Gym Gremlin", status: "paid" },
];
const STATUS: Record<Status, [string, string]> = {
  held: [`Held ${HOLD_DAYS} days`, "bg-amber-100 text-amber-900"],
  paid: ["Paid", "bg-lime-100 text-lime-900"],
  refunded: ["Refunded, reversed", "bg-stone-200 text-stone-700"],
  rejected: ["Blocked as fraud", "bg-red-100 text-red-800"],
};

export default async function Results() {
  await requireAdmin();
  const clicks = BY_CREATOR.reduce((s, c) => s + c.clicks, 0);
  const sales = BY_CREATOR.reduce((s, c) => s + c.sales, 0);
  const paidSales = 74; // older than the hold
  const heldSales = sales - paidSales;
  const deposit = 5000;
  const spent = sales * PAYOUT;
  const stat = (v: string, l: string, sub?: string) => (
    <div className={card}><p className="text-2xl font-black">{v}</p><p className="text-sm text-stone-600">{l}</p>{sub && <p className="mt-1 text-xs text-stone-500">{sub}</p>}</div>
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-black">Acme Therapy · &ldquo;Try 1 week of therapy free&rdquo;</h1>
          <p className="text-sm text-stone-600">{usd(PAYOUT)} per sale · 4 creators · sample numbers</p>
        </div>
        <span className="rounded-full bg-lime-300 px-3 py-1 text-sm font-bold">● Running</span>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {stat(clicks.toLocaleString(), "clicks")}
        {stat(String(sales), "sales", `${((100 * sales) / clicks).toFixed(1)}% of clicks`)}
        {stat(usd(spent), "spent on sales", `${usd(spent / sales)} per sale`)}
        {stat(usd(deposit - spent), "deposit left", `of ${usd(deposit)}`)}
      </div>

      <section className={card}>
        <h2 className="font-black">Where your money is</h2>
        <div className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
          <div className="rounded-xl bg-amber-100 p-3"><p className="text-xl font-black">{usd(heldSales * PAYOUT)}</p><p>Held for {HOLD_DAYS} days ({heldSales} sales). Refunds in this window come back to your deposit.</p></div>
          <div className="rounded-xl bg-lime-100 p-3"><p className="text-xl font-black">{usd(paidSales * PAYOUT * (1 - LINKSHIT_CUT))}</p><p>Paid to creators ({paidSales} sales).</p></div>
          <div className="rounded-xl bg-stone-100 p-3"><p className="text-xl font-black">{usd(paidSales * PAYOUT * LINKSHIT_CUT)}</p><p>linksh.it fee ({LINKSHIT_CUT * 100}% of paid commissions).</p></div>
        </div>
      </section>

      <section className={`${card} overflow-x-auto`}>
        <h2 className="font-black">By creator</h2>
        <table className="mt-2 w-full text-left text-sm">
          <thead className="text-stone-500"><tr><th className="py-1 font-semibold">Creator</th><th className="font-semibold">Clicks</th><th className="font-semibold">Sales</th><th className="font-semibold">Rate</th><th className="font-semibold">Cost</th></tr></thead>
          <tbody>
            {BY_CREATOR.map((c) => (
              <tr key={c.name} className="border-t border-stone-100"><td className="py-1.5 font-semibold">{c.name}</td><td>{c.clicks.toLocaleString()}</td><td>{c.sales}</td><td>{((100 * c.sales) / c.clicks).toFixed(1)}%</td><td>{usd(c.sales * PAYOUT)}</td></tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className={card}>
        <h2 className="font-black">Latest sales</h2>
        <ul className="mt-2 divide-y divide-stone-100 text-sm">
          {LEDGER.map((r, i) => (
            <li key={i} className="flex flex-wrap items-center justify-between gap-2 py-2">
              <span><b>{r.creator}</b> <span className="text-stone-500">· {r.day} day{r.day > 1 ? "s" : ""} ago{r.note ? ` · ${r.note}` : ""}</span></span>
              <span className="flex items-center gap-2">
                <span className={r.status === "refunded" || r.status === "rejected" ? "text-stone-400 line-through" : "font-semibold"}>{usd(PAYOUT)}</span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${STATUS[r.status][1]}`}>{STATUS[r.status][0]}</span>
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-stone-500">Blocked automatically: the creator clicking their own offer, bots, and the same buyer twice. You can also reject a sale that looks like junk.</p>
      </section>

      <section className={card}>
        <h2 className="font-black">Tracking setup</h2>
        <p className="mt-1 text-sm text-stone-600">Tell us when a sale happens. Pick one:</p>
        <p className="mt-3 text-sm font-semibold">A. Postback (best). Your server calls this after each sale:</p>
        <pre className="mt-1 overflow-x-auto rounded-lg bg-stone-900 p-3 text-xs text-lime-300">https://linksh.it/api/postback?offer=12&amp;click={"{click_id}"}&amp;amount={"{sale_amount}"}&amp;key=•••••••</pre>
        <p className="mt-3 text-sm font-semibold">B. Pixel. Paste on your thank-you page:</p>
        <pre className="mt-1 overflow-x-auto rounded-lg bg-stone-900 p-3 text-xs text-lime-300">{`<img src="https://linksh.it/api/pixel?offer=12" width="1" height="1" alt="">`}</pre>
        <p className="mt-3 text-sm font-semibold">C. Already on an affiliate network (Impact, PartnerStack…)? Give us the tracking link and we read sales from there.</p>
      </section>
    </div>
  );
}

export const instant = false;
