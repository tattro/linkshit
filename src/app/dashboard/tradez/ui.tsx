import Link from "next/link";
import { DashboardHeader } from "../DashboardHeader";
import { MAX_ACTIVE_TRADES, SIZE_TIERS, sizeTier, tradezLaunched, type DirectoryRow } from "@/lib/tradez";
import { CREATOR_TYPES, isCreatorType } from "@/lib/creatorTypes";
import { avatarUrl } from "@/components/ProfileView";

// Link Tradez is styled like a 2004 web directory on purpose: Verdana, beveled boxes, navy title bars.
const CSS = `
.lt { font-family: Verdana, Tahoma, Geneva, sans-serif; font-size: 13px; color: #111; }
.lt-bg { background: #c8d3e6 repeating-linear-gradient(45deg, transparent 0 6px, rgba(255,255,255,.18) 6px 12px); }
.lt-box { background: #fff; border: 1px solid #5a6f96; box-shadow: 3px 3px 0 #33415e; }
.lt-bar { background: linear-gradient(#3d5a99, #233a6e); color: #fff; font-weight: bold; padding: 5px 10px; border-bottom: 1px solid #1a2a52; letter-spacing: .02em; }
.lt-bar a { color: #fff; }
.lt-row:nth-child(even) { background: #eef2fa; }
.lt-btn { display: inline-block; cursor: pointer; font: bold 12px Verdana, Tahoma, sans-serif; color: #111; padding: 4px 12px;
  background: linear-gradient(#fff, #d9d9d9); border: 1px solid #777; border-radius: 3px; box-shadow: inset 0 1px 0 #fff; text-decoration: none; }
.lt-btn:hover { background: linear-gradient(#fffbe0, #f2d75c); border-color: #8a6d00; }
.lt-btn-go { background: linear-gradient(#bff27a, #7cc423); border-color: #3c6a07; }
.lt-btn-go:hover { background: linear-gradient(#d8ff9e, #8fd92f); }
.lt-btn-no { background: linear-gradient(#ffd9d9, #f19b9b); border-color: #8a1f1f; }
.lt-input { font: 13px Verdana, Tahoma, sans-serif; border: 2px inset #ccc; padding: 4px 6px; background: #fff; width: 100%; }
.lt-link { color: #1a37a8; text-decoration: underline; }
.lt-link:visited { color: #5b1a8f; }
.lt-link:hover { color: #d60000; }
.lt-chip { display: inline-block; padding: 2px 8px; border: 1px solid #5a6f96; background: #fff; color: #1a37a8; text-decoration: none; font-size: 12px; }
.lt-chip[aria-current="true"] { background: #233a6e; color: #fff; font-weight: bold; }
.lt-staff { display: inline-block; font: bold 9px Verdana, sans-serif; letter-spacing: .08em; color: #fff; background: #d60000; border: 1px solid #7a0000; padding: 1px 4px; vertical-align: middle; }
.lt-new { display: inline-block; font: bold 9px Verdana, sans-serif; color: #000; background: #ffef00; border: 1px solid #a89b00; padding: 1px 4px; vertical-align: middle; }
.lt-small { font-size: 11px; color: #4a4a4a; }
.lt-title { font-family: "Trebuchet MS", Verdana, sans-serif; font-weight: 900; color: #fff; text-shadow: 2px 2px 0 #b30000, 4px 4px 0 #1a2a52; letter-spacing: .02em; }
@keyframes lt-ticker { from { transform: translateX(0); } to { transform: translateX(-50%); } }
.lt-ticker > span { display: inline-block; white-space: nowrap; animation: lt-ticker 40s linear infinite; }
@media (prefers-reduced-motion: reduce) { .lt-ticker > span { animation: none; } }
`;

const TICKER = "★ Find creators in your lane ★ Send a trade request ★ Both agree, both links go live ★ Trades run for a set time, then come down by themselves ★ Live links are locked: changes need the other side's OK ";

/** Header, retro banner and the Directory / My trades tabs. */
export async function TradezShell({ tab, incoming = 0, children }: { tab: "directory" | "trades"; incoming?: number; children: React.ReactNode }) {
  return (
    <div className="lt lt-bg min-h-screen">
      <style>{CSS}</style>
      <DashboardHeader active="tradez" />
      <main className="mx-auto max-w-5xl space-y-5 px-4 py-6 sm:px-6">
        <div className="lt-box overflow-hidden">
          <div className="bg-gradient-to-b from-[#3d5a99] to-[#10204a] px-5 py-6 text-center">
            <h1 className="lt-title text-4xl sm:text-5xl">🤝 Link Tradez</h1>
            <p className="mt-2 text-sm font-bold text-[#ffef00]">You put my link on your page. I put yours on mine. Everybody wins.</p>
          </div>
          <div className="lt-ticker overflow-hidden border-t border-[#1a2a52] bg-black py-1 font-mono text-xs text-[#7CFC00]" aria-hidden>
            {/* Two copies back to back so the loop is seamless */}
            <span>{TICKER}{TICKER}</span>
          </div>
          {!tradezLaunched() && (
            <p className="border-t border-[#a89b00] bg-[#fffbd1] px-4 py-2 text-center text-xs">
              <span className="lt-new">PREVIEW</span> Only staff can see Link Tradez right now. Set <code>LINK_TRADEZ_OPEN=1</code> to open it to every creator.
            </p>
          )}
        </div>
        <nav className="flex flex-wrap gap-2" aria-label="Link Tradez">
          <Link href="/dashboard/tradez" className="lt-chip" aria-current={tab === "directory"}>📇 Creator directory</Link>
          <Link href="/dashboard/tradez/trades" className="lt-chip" aria-current={tab === "trades"}>
            🔁 My trades{incoming > 0 && <> <span className="lt-new">{incoming} NEW</span></>}
          </Link>
        </nav>
        {children}
        <p className="pb-4 text-center lt-small">
          Link Tradez · Best viewed in Netscape Navigator at 800×600 · Trade links are marked nofollow for search engines
        </p>
      </main>
    </div>
  );
}

/** The one-line message an action redirects back with (?ok= or ?err=). */
export function Flash({ ok, err }: { ok?: string; err?: string }) {
  if (!ok && !err) return null;
  return (
    <p role="status" className={`lt-box px-4 py-2 font-bold ${err ? "bg-[#ffe0e0] text-[#8a1f1f]" : "bg-[#e6ffd0] text-[#2c5a00]"}`}>
      {err ? "⚠️ " : "✅ "}{err ?? ok}
    </p>
  );
}

export function Avatar({ src, name, size = 56 }: { src: string | null; name: string; size?: number }) {
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" width={size} height={size} className="shrink-0 border border-[#5a6f96] object-cover" style={{ width: size, height: size }} />
  ) : (
    <span aria-hidden className="flex shrink-0 items-center justify-center border border-[#5a6f96] bg-[#233a6e] font-bold text-white" style={{ width: size, height: size, fontSize: size / 2.4 }}>
      {(name[0] ?? "?").toUpperCase()}
    </span>
  );
}

export const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

/** One creator in the directory: who they are, their trade stats, and the request button. */
export function CreatorCard({ c, status, compact = false }: { c: DirectoryRow; status?: "pending" | "live" | "full"; compact?: boolean }) {
  const type = isCreatorType(c.creatorType) ? CREATOR_TYPES[c.creatorType].label : "🤷 Creator";
  const tier = SIZE_TIERS[sizeTier(c.views30)];
  const spots = Math.max(0, MAX_ACTIVE_TRADES - c.liveTrades);
  return (
    <div className="lt-box flex flex-col">
      <div className="flex gap-3 p-3">
        <Avatar src={avatarUrl(c)} name={c.displayName || c.handle} />
        <div className="min-w-0">
          <p className="truncate font-bold">
            {c.displayName || c.handle} {c.staff && <span className="lt-staff" title="Works at linksh.it">STAFF</span>}
          </p>
          <a href={`/${c.handle}`} target="_blank" className="lt-link block truncate text-xs">linksh.it/{c.handle}</a>
          <p className="lt-small mt-0.5">{type} · {tier.icon} {tier.label}</p>
        </div>
      </div>
      {c.pitch && <p className="mx-3 mb-2 border-l-4 border-[#f2d75c] bg-[#fffbe6] px-2 py-1 text-xs italic">&ldquo;{c.pitch}&rdquo;</p>}
      {!compact && (
        <table className="mx-3 mb-2 text-xs">
          <tbody>
            <tr><td className="pr-2 text-[#4a4a4a]">Trades done</td><td className="font-bold">{c.tradesDone}</td></tr>
            <tr><td className="pr-2 text-[#4a4a4a]">Clicks sent to partners</td><td className="font-bold">{c.clicksSent.toLocaleString()}</td></tr>
            <tr><td className="pr-2 text-[#4a4a4a]">Trade spots open</td><td className="font-bold">{spots} of {MAX_ACTIVE_TRADES}</td></tr>
          </tbody>
        </table>
      )}
      <div className="mt-auto border-t border-[#c8d3e6] bg-[#f3f5fa] px-3 py-2">
        {status === "live" ? <span className="text-xs font-bold text-[#2c5a00]">✅ You&apos;re trading</span>
          : status === "pending" ? <Link href="/dashboard/tradez/trades" className="text-xs font-bold text-[#8a6d00]">⏳ Request pending</Link>
          : spots === 0 || status === "full" ? <span className="lt-small">No open trade spots</span>
          : <Link href={`/dashboard/tradez/request/${c.handle}`} className="lt-btn lt-btn-go">🤝 Request trade</Link>}
      </div>
    </div>
  );
}
