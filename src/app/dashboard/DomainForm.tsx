"use client";

import { startTransition, useActionState, useEffect } from "react";
import { checkDomain, connectDomain, disconnectDomain, type DomainState } from "@/app/actions/domain";
import { btn, ghost, input } from "./editor";

function Records({ domain, apex, txt }: { domain: string; apex: boolean; txt?: { name: string; value: string } }) {
  const host = apex ? "@" : domain.split(".").slice(0, -2).join(".");
  const rows: [string, string, string][] = [apex ? ["A", "@", "76.76.21.21"] : ["CNAME", host, "cname.vercel-dns.com"]];
  if (txt) rows.push(["TXT", txt.name.replace(`.${domain.split(".").slice(-2).join(".")}`, ""), txt.value]);
  return (
    <div className="overflow-x-auto rounded-lg border-2 border-stone-200">
      <table className="w-full text-left font-mono text-sm">
        <thead className="bg-stone-50 text-xs text-stone-500">
          <tr><th className="px-3 py-2">Type</th><th className="px-3 py-2">Name</th><th className="px-3 py-2">Value</th></tr>
        </thead>
        <tbody>
          {rows.map(([t, n, v]) => (
            <tr key={t} className="border-t border-stone-200">
              <td className="px-3 py-2">{t}</td><td className="px-3 py-2">{n}</td><td className="break-all px-3 py-2">{v}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function DomainForm({ current, enabled, apex }: { current: string | null; enabled: boolean; apex: boolean }) {
  const [state, connect, connecting] = useActionState(connectDomain, undefined);
  const [check, recheck, checking] = useActionState(async (): Promise<DomainState> => checkDomain(), undefined);
  useEffect(() => { if (current && enabled) startTransition(() => recheck()); }, [current, enabled, recheck]);
  const status = (state?.status ?? check?.status) ?? null;

  if (!enabled) {
    return <p className="text-sm text-stone-500">Coming soon. Custom domains aren&apos;t switched on for linksh.it yet.</p>;
  }
  if (!current) {
    return (
      <form action={connect} className="space-y-2">
        <div className="flex gap-2">
          <input name="domain" required placeholder="links.yoursite.com" aria-label="Your domain" className={input} />
          <button disabled={connecting} className={`${btn} shrink-0`}>{connecting ? "Connecting…" : "Connect"}</button>
        </div>
        <p className="text-xs text-stone-500">A subdomain like links.yoursite.com is easiest. A whole domain (yoursite.com) works too.</p>
        {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      </form>
    );
  }
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <span className="font-mono font-semibold">{current}</span>
        {status?.state === "live" && <span className="rounded bg-lime-100 px-2 py-0.5 text-xs font-semibold text-lime-800">● Live</span>}
        {status?.state === "pending" && <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">● Waiting for DNS</span>}
        {status?.state === "error" && <span className="rounded bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-800">● Problem</span>}
        {!status && <span className="text-xs text-stone-400">Checking…</span>}
      </div>
      {status?.state !== "live" && (
        <>
          <p className="text-sm text-stone-600">Add {status?.txt ? "these records" : "this record"} where you bought the domain (GoDaddy, Namecheap, Cloudflare…):</p>
          <Records domain={current} apex={apex} txt={status?.txt} />
          <p className="text-xs text-stone-500">DNS changes can take a few minutes to an hour. SSL is set up automatically once it connects.</p>
        </>
      )}
      {status?.detail && <p className="text-sm text-red-600">{status.detail}</p>}
      {(check?.error || state?.error) && <p className="text-sm text-red-600">{check?.error ?? state?.error}</p>}
      <div className="flex gap-2">
        {status?.state !== "live" && (
          <button type="button" disabled={checking} onClick={() => startTransition(() => recheck())} className={btn}>
            {checking ? "Checking…" : "Check again"}
          </button>
        )}
        {status?.state === "live" && (
          <a href={`https://${current}`} target="_blank" className={btn}>Visit ↗</a>
        )}
        <form action={disconnectDomain}>
          <button className={`${ghost} px-3 py-2`}>Disconnect</button>
        </form>
      </div>
    </div>
  );
}
