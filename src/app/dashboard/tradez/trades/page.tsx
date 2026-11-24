import Link from "next/link";
import { desc, eq, or } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { acceptTrade, answerTradeChange, declineTrade, endTrade, requestTradeChange } from "@/app/actions/tradez";
import { db, linkTrades, users, type LinkTrade } from "@/db";
import { avatarUrl } from "@/components/ProfileView";
import { siteUrl } from "@/lib/request";
import { durationLabel, MAX_TRADE_TITLE, requireTradezAccount, tradeIsLive, tradeSides } from "@/lib/tradez";
import { Avatar, Flash, one, TradezShell } from "../ui";

export const metadata = { title: "My trades · Link Tradez" };

const proposer = alias(users, "proposer");
const partner = alias(users, "partner");

function left(until: Date) {
  const days = Math.ceil((until.getTime() - Date.now()) / 86400000);
  return days <= 1 ? "ends today" : `${days} days left`;
}

const short = (url: string) => url.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "");

export default async function MyTrades({ searchParams }: PageProps<"/dashboard/tradez/trades">) {
  const me = await requireTradezAccount();
  const sp = await searchParams;
  const [rows, site] = await Promise.all([
    db.select({
      trade: linkTrades,
      a: { id: proposer.id, handle: proposer.handle, displayName: proposer.displayName, avatarVersion: proposer.avatarVersion },
      b: { id: partner.id, handle: partner.handle, displayName: partner.displayName, avatarVersion: partner.avatarVersion },
    })
      .from(linkTrades)
      .innerJoin(proposer, eq(proposer.id, linkTrades.proposerId))
      .innerJoin(partner, eq(partner.id, linkTrades.partnerId))
      .where(or(eq(linkTrades.proposerId, me.id), eq(linkTrades.partnerId, me.id)))
      .orderBy(desc(linkTrades.createdAt))
      .limit(100),
    siteUrl(),
  ]);
  const list = rows.map((r) => ({ t: r.trade, them: r.trade.proposerId === me.id ? r.b : r.a, ...tradeSides(r.trade, me.id) }));
  const incoming = list.filter((x) => x.t.status === "pending" && !x.mine);
  const sent = list.filter((x) => x.t.status === "pending" && x.mine);
  const live = list.filter((x) => tradeIsLive(x.t));
  const past = list.filter((x) => x.t.status !== "pending" && !tradeIsLive(x.t)).slice(0, 30);

  type Row = (typeof list)[number];
  const who = (x: Row) => (
    <div className="flex items-center gap-2">
      <Avatar src={avatarUrl(x.them)} name={x.them.displayName || x.them.handle} size={36} />
      <div className="min-w-0">
        <p className="truncate font-bold">{x.them.displayName || x.them.handle}</p>
        <a href={`/${x.them.handle}`} target="_blank" className="lt-link text-xs">linksh.it/{x.them.handle}</a>
      </div>
    </div>
  );
  const linkLine = (title: string | null, url: string | null) =>
    title && url ? <><b>{title}</b> <span className="lt-small">→ <a href={url} target="_blank" rel="nofollow noopener" className="lt-link">{short(url)}</a></span></> : <span className="lt-small">(not picked yet)</span>;
  const idField = (t: LinkTrade) => <input type="hidden" name="id" value={t.id} />;

  return (
    <TradezShell tab="trades" incoming={incoming.length}>
      <Flash ok={one(sp.ok)} err={one(sp.err)} />

      <section className="lt-box">
        <h2 className="lt-bar">📥 Requests for you ({incoming.length})</h2>
        {incoming.length === 0 ? <p className="p-4 lt-small">Nothing waiting. <Link href="/dashboard/tradez" className="lt-link">Go find someone to trade with</Link>.</p> : incoming.map((x) => (
          <div key={x.t.id} className="lt-row space-y-3 border-b border-[#c8d3e6] p-4 last:border-0">
            <div className="flex flex-wrap items-start justify-between gap-2">
              {who(x)}
              <span className="lt-small">{durationLabel(x.t.durationDays)} trade</span>
            </div>
            <p className="text-xs">They want this on your page: {linkLine(x.theirTitle, x.theirUrl)}</p>
            {x.t.note && <p className="border-l-4 border-[#f2d75c] bg-[#fffbe6] px-2 py-1 text-xs italic">&ldquo;{x.t.note}&rdquo;</p>}
            <form action={acceptTrade} className="space-y-2 border border-[#5a6f96] bg-white p-3">
              {idField(x.t)}
              <p className="font-bold">Your link on their page</p>
              <div className="grid gap-2 sm:grid-cols-[1fr_2fr]">
                <input name="title" required maxLength={MAX_TRADE_TITLE} defaultValue={me.displayName || `@${me.handle}`} className="lt-input" aria-label="Button text" />
                <input name="url" required defaultValue={`${site}/${me.handle}`} className="lt-input" aria-label="Where it goes" inputMode="url" />
              </div>
              <div className="flex flex-wrap gap-2">
                <button className="lt-btn lt-btn-go">✅ I agree, start the trade</button>
                <button formAction={declineTrade} className="lt-btn lt-btn-no">✖ No thanks</button>
              </div>
            </form>
          </div>
        ))}
      </section>

      <section className="lt-box">
        <h2 className="lt-bar">🔁 Live trades ({live.length})</h2>
        {live.length === 0 ? <p className="p-4 lt-small">No live trades yet.</p> : live.map((x) => {
          const theirChange = x.t.changeBy && x.t.changeBy !== me.id;
          const myChange = x.t.changeBy === me.id;
          return (
            <div key={x.t.id} className="lt-row space-y-2 border-b border-[#c8d3e6] p-4 last:border-0">
              <div className="flex flex-wrap items-start justify-between gap-2">
                {who(x)}
                <span className="lt-new">{left(x.t.expiresAt!)}</span>
              </div>
              <table className="w-full text-xs">
                <tbody>
                  <tr><td className="w-40 py-0.5 align-top text-[#4a4a4a]">On your page 🔒</td><td>{linkLine(x.theirTitle, x.theirUrl)} · <b>{x.theirClicks}</b> clicks you sent them</td></tr>
                  <tr><td className="py-0.5 align-top text-[#4a4a4a]">On their page 🔒</td><td>{linkLine(x.myTitle, x.myUrl)} · <b>{x.myClicks}</b> clicks they sent you</td></tr>
                </tbody>
              </table>
              {theirChange && (
                <form action={answerTradeChange} className="border border-[#a89b00] bg-[#fffbd1] p-2 text-xs">
                  {idField(x.t)}
                  <p>They want to change their link on your page to: {linkLine(x.t.changeTitle, x.t.changeUrl)}</p>
                  <div className="mt-2 flex gap-2">
                    <button name="approve" value="1" className="lt-btn lt-btn-go">Approve</button>
                    <button name="approve" value="0" className="lt-btn lt-btn-no">Reject</button>
                  </div>
                </form>
              )}
              {myChange && (
                <form action={answerTradeChange} className="border border-[#a89b00] bg-[#fffbd1] p-2 text-xs">
                  {idField(x.t)}
                  <p>⏳ Waiting on them to approve your change to: {linkLine(x.t.changeTitle, x.t.changeUrl)}</p>
                  <button name="approve" value="0" className="lt-btn mt-2">Withdraw change</button>
                </form>
              )}
              <div className="flex flex-wrap items-start gap-2">
                {!x.t.changeBy && (
                  <details className="text-xs">
                    <summary className="lt-btn">✏️ Change my link</summary>
                    <form action={requestTradeChange} className="mt-2 space-y-2 border border-[#5a6f96] bg-white p-2">
                      {idField(x.t)}
                      <input name="title" required maxLength={MAX_TRADE_TITLE} defaultValue={x.myTitle ?? ""} className="lt-input" aria-label="Button text" />
                      <input name="url" required defaultValue={x.myUrl ?? ""} className="lt-input" aria-label="Where it goes" inputMode="url" />
                      <button className="lt-btn">Ask them to approve</button>
                    </form>
                  </details>
                )}
                <form action={endTrade}>
                  {idField(x.t)}
                  <button className="lt-btn lt-btn-no">End trade</button>
                </form>
              </div>
            </div>
          );
        })}
      </section>

      {sent.length > 0 && (
        <section className="lt-box">
          <h2 className="lt-bar">📤 Waiting on them ({sent.length})</h2>
          {sent.map((x) => (
            <div key={x.t.id} className="lt-row flex flex-wrap items-center justify-between gap-3 border-b border-[#c8d3e6] p-4 last:border-0">
              {who(x)}
              <p className="text-xs">You offered: {linkLine(x.myTitle, x.myUrl)} · {durationLabel(x.t.durationDays)}</p>
              <form action={declineTrade}>{idField(x.t)}<button className="lt-btn">Withdraw</button></form>
            </div>
          ))}
        </section>
      )}

      {past.length > 0 && (
        <section className="lt-box">
          <h2 className="lt-bar">📜 Trade history</h2>
          {past.map((x) => (
            <div key={x.t.id} className="lt-row flex flex-wrap items-center justify-between gap-3 border-b border-[#c8d3e6] p-4 last:border-0">
              {who(x)}
              {x.t.status === "declined" ? (
                <p className="lt-small">Didn&apos;t happen{x.mine ? "" : " (you passed)"}</p>
              ) : (
                <p className="text-xs">
                  🧾 <b>Recap:</b> this trade sent you <b>{x.myClicks.toLocaleString()}</b> click{x.myClicks === 1 ? "" : "s"}, and you sent them <b>{x.theirClicks.toLocaleString()}</b>.
                  {" "}<span className="lt-small">{x.t.status === "ended" ? "Ended early" : "Ran its full " + durationLabel(x.t.durationDays)}</span>
                </p>
              )}
            </div>
          ))}
        </section>
      )}
    </TradezShell>
  );
}

// Per-viewer page: render at request time
export const instant = false;
