import Link from "next/link";
import { notFound } from "next/navigation";
import { proposeTrade } from "@/app/actions/tradez";
import { siteUrl } from "@/lib/request";
import {
  directory, durationLabel, MAX_ACTIVE_TRADES, MAX_NOTE, MAX_TRADE_TITLE, myTradeState, requireTradezAccount, TRADE_DURATIONS,
} from "@/lib/tradez";
import { CreatorCard, Flash, one, TradezShell } from "../../ui";

export const metadata = { title: "Request a trade · Link Tradez" };

export default async function RequestTrade({ params, searchParams }: PageProps<"/dashboard/tradez/request/[handle]">) {
  const me = await requireTradezAccount();
  const { handle } = await params;
  const sp = await searchParams;
  // Only creators you could actually trade with (listed, same side of the 18+ line, not you)
  const [[them], state, site] = await Promise.all([directory(me, { handle: decodeURIComponent(handle) }), myTradeState(me.id), siteUrl()]);
  if (!them) notFound();
  const status = state.status.get(them.id);
  const blocked = status ? (status === "live" ? "You're already trading with them." : "There's already a request between you two.")
    : state.live >= MAX_ACTIVE_TRADES ? `You already have ${MAX_ACTIVE_TRADES} live trades. End one before starting another.`
    : them.liveTrades >= MAX_ACTIVE_TRADES ? "Their trade spots are all full right now. Check back later." : null;

  return (
    <TradezShell tab="directory" incoming={state.incoming}>
      <Flash ok={one(sp.ok)} err={one(sp.err)} />
      <p><Link href="/dashboard/tradez" className="lt-link">« Back to the directory</Link></p>
      <div className="grid gap-5 md:grid-cols-[280px_1fr]">
        <CreatorCard c={them} status={status} />
        <section className="lt-box">
          <h2 className="lt-bar">🤝 Request a link trade with @{them.handle}</h2>
          {blocked ? (
            <p className="p-4">{blocked} <Link href="/dashboard/tradez/trades" className="lt-link">See my trades</Link></p>
          ) : (
            <form action={proposeTrade} className="space-y-4 p-4">
              <input type="hidden" name="handle" value={them.handle} />
              <ol className="list-decimal space-y-1 pl-5 text-xs">
                <li>You pick the link that goes on <b>their</b> page. Sending this request is your &ldquo;I agree&rdquo;.</li>
                <li>If they accept, they pick the link that goes on <b>yours</b>.</li>
                <li>Both links show at the bottom of both pages with &ldquo;Trading with @…&rdquo; under them, until the time runs out or one of you ends it.</li>
                <li>Live links are locked. Changing yours later needs their OK.</li>
              </ol>
              <fieldset className="space-y-2 border border-[#5a6f96] p-3">
                <legend className="px-1 font-bold">Your link on their page</legend>
                <label className="block">
                  <span className="lt-small">Button text ({MAX_TRADE_TITLE} characters)</span>
                  <input name="title" required maxLength={MAX_TRADE_TITLE} defaultValue={me.displayName || `@${me.handle}`} className="lt-input mt-1" />
                </label>
                <label className="block">
                  <span className="lt-small">Where it goes</span>
                  <input name="url" required defaultValue={`${site}/${me.handle}`} className="lt-input mt-1" inputMode="url" />
                </label>
              </fieldset>
              <label className="block">
                <span className="font-bold">How long?</span>
                <select name="days" defaultValue="14" className="lt-input mt-1 w-auto">
                  {TRADE_DURATIONS.map((d) => <option key={d} value={d}>{durationLabel(d)}</option>)}
                </select>
                <span className="lt-small ml-2">The clock starts when they accept.</span>
              </label>
              <label className="block">
                <span className="font-bold">Note to @{them.handle}</span> <span className="lt-small">(optional, {MAX_NOTE} characters)</span>
                <textarea name="note" maxLength={MAX_NOTE} rows={3} className="lt-input mt-1" placeholder="Why it's a good match: similar audience, same city, you make beats and I need them…" />
              </label>
              <button className="lt-btn lt-btn-go">📨 Send trade request</button>
            </form>
          )}
        </section>
      </div>
    </TradezShell>
  );
}

// Per-viewer page: render at request time
export const instant = false;
