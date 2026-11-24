import Link from "next/link";
import { updateListing } from "@/app/actions/tradez";
import { CREATOR_TYPES, isCreatorType } from "@/lib/creatorTypes";
import { avatarUrl } from "@/components/ProfileView";
import {
  directory, isAdultPage, MAX_ACTIVE_TRADES, MAX_PITCH, myStats, myTradeState, requireTradezAccount, SIZE_TIERS, sizeTier, suggestMatches,
} from "@/lib/tradez";
import { Avatar, CreatorCard, Flash, one, TradezShell } from "./ui";

export const metadata = { title: "Link Tradez" };

export default async function TradezDirectory({ searchParams }: PageProps<"/dashboard/tradez">) {
  const me = await requireTradezAccount();
  const sp = await searchParams;
  const type = one(sp.type);
  const q = one(sp.q) ?? "";
  const filter = type && isCreatorType(type) ? type : undefined;

  const [rows, everyone, stats, state] = await Promise.all([
    directory(me, { type: filter, q }),
    // Suggestions look across the whole directory, not just the current filter
    filter || q ? directory(me, { limit: 200 }) : null,
    myStats(me.id),
    myTradeState(me.id),
  ]);
  const suggested = suggestMatches({ creatorType: me.creatorType, views30: stats.views30 }, everyone ?? rows, new Set(state.status.keys()));
  const full = state.live >= MAX_ACTIVE_TRADES;
  const cardStatus = (id: number) => state.status.get(id) ?? (full ? "full" : undefined);
  const adult = isAdultPage(me);
  const tier = SIZE_TIERS[sizeTier(stats.views30)];
  const types = Object.entries(CREATOR_TYPES).filter(([k]) => (adult ? k === "adult" : k !== "adult"));

  return (
    <TradezShell tab="directory" incoming={state.incoming}>
      <Flash ok={one(sp.ok)} err={one(sp.err)} />

      <section className="lt-box">
        <h2 className="lt-bar">📌 Your listing</h2>
        <div className="grid gap-4 p-4 md:grid-cols-[1fr_auto]">
          <form action={updateListing} className="space-y-3">
            <div className="flex items-center gap-3">
              <Avatar src={avatarUrl(me)} name={me.displayName || me.handle} size={44} />
              <div className="min-w-0">
                <p className="truncate font-bold">{me.displayName || me.handle}</p>
                <p className="lt-small">linksh.it/{me.handle} · {isCreatorType(me.creatorType) ? CREATOR_TYPES[me.creatorType].label : "No category yet"} · {tier.icon} {tier.label}</p>
              </div>
            </div>
            <label className="flex items-center gap-2 font-bold">
              <input type="checkbox" name="listed" defaultChecked={me.tradezListed} className="h-4 w-4" />
              List me in the directory so other creators can send me trade requests
            </label>
            <label className="block">
              <span className="lt-small">Your pitch: who do you want to trade with? ({MAX_PITCH} characters)</span>
              <input name="pitch" defaultValue={me.tradezPitch} maxLength={MAX_PITCH} className="lt-input mt-1" placeholder="Indie R&B singer, looking for producers and other singers around 1k views" />
            </label>
            <button className="lt-btn">💾 Save listing</button>
            {!isCreatorType(me.creatorType) && (
              <p className="lt-small">Tip: pick what you do on the <Link href="/dashboard" className="lt-link">Editor</Link> so you show up in the right category.</p>
            )}
            {adult && <p className="lt-small">🔞 Your page is 18+, so you only see and trade with other 18+ pages.</p>}
          </form>
          <table className="h-fit border border-[#5a6f96] text-xs">
            <tbody>
              <tr className="lt-row"><td className="px-3 py-1.5">Live trades</td><td className="px-3 font-bold">{state.live} of {MAX_ACTIVE_TRADES}</td></tr>
              <tr className="lt-row"><td className="px-3 py-1.5">Trades done</td><td className="px-3 font-bold">{stats.tradesDone}</td></tr>
              <tr className="lt-row"><td className="px-3 py-1.5">Clicks you sent partners</td><td className="px-3 font-bold">{stats.clicksSent.toLocaleString()}</td></tr>
              <tr className="lt-row"><td className="px-3 py-1.5">Clicks partners sent you</td><td className="px-3 font-bold">{stats.clicksGot.toLocaleString()}</td></tr>
            </tbody>
          </table>
        </div>
      </section>

      {suggested.length > 0 && (
        <section className="lt-box">
          <h2 className="lt-bar">✨ Suggested matches <span className="font-normal opacity-80">· same lane, similar size</span></h2>
          <div className="grid gap-3 p-3 sm:grid-cols-3">
            {suggested.map((c) => <CreatorCard key={c.id} c={c} status={cardStatus(c.id)} compact />)}
          </div>
        </section>
      )}

      <section className="lt-box">
        <h2 className="lt-bar">📇 Creator directory</h2>
        <div className="space-y-3 border-b border-[#c8d3e6] p-3">
          <form className="flex gap-2" role="search">
            {filter && <input type="hidden" name="type" value={filter} />}
            <input name="q" defaultValue={q} placeholder="Search by name, handle or pitch…" className="lt-input" aria-label="Search creators" />
            <button className="lt-btn">Search</button>
          </form>
          <div className="flex flex-wrap gap-1.5">
            <Link href={q ? `?q=${encodeURIComponent(q)}` : "?"} className="lt-chip" aria-current={!filter}>All</Link>
            {types.map(([k, v]) => (
              <Link key={k} href={`?type=${k}${q ? `&q=${encodeURIComponent(q)}` : ""}`} className="lt-chip" aria-current={filter === k}>{v.label}</Link>
            ))}
          </div>
        </div>
        {rows.length === 0 ? (
          <p className="p-8 text-center">
            <span className="text-3xl">🦗</span><br />
            {q || filter ? "Nobody matches that yet. Try another category." : "Nobody's listed yet. Be the first: tick the box above."}
          </p>
        ) : (
          <div className="grid gap-3 p-3 sm:grid-cols-2 lg:grid-cols-3">
            {rows.map((c) => <CreatorCard key={c.id} c={c} status={cardStatus(c.id)} />)}
          </div>
        )}
      </section>
    </TradezShell>
  );
}

// Per-viewer page: render at request time
export const instant = false;
