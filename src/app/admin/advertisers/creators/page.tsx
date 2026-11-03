import { requireAdmin } from "@/lib/auth";
import { countryName, GEO_COUNTRIES } from "@/lib/geo";
import { ctr, getCreators, matches, NICHES, nicheLabel, short, type Creator } from "../data";

const sel = "rounded-lg border-2 border-stone-300 bg-white px-2 py-1.5 text-sm outline-none focus:border-stone-900";

export default async function CreatorBrowser({ searchParams }: PageProps<"/admin/advertisers/creators">) {
  await requireAdmin();
  const sp = await searchParams;
  const s = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : "");
  const f = { niche: s("niche"), country: s("country"), minClicks: Number(s("min")) || 0, noAdult: s("adult") !== "1" };
  const all = await getCreators();
  const list = all.filter((c) => matches(c, f)).sort((a, b) => b.clicks30 - a.clicks30);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-black">Find creators</h1>
        <p className="text-sm text-stone-600">Only creators who said yes to advertisers. Stats are the last 30 days, tracked by linksh.it. Follower counts are what the creator entered, so check their profiles.</p>
      </div>

      <form className="flex flex-wrap items-end gap-2 rounded-2xl border-2 border-stone-900 bg-white p-3">
        <label className="text-xs font-semibold">Niche<br />
          <select name="niche" defaultValue={f.niche} className={sel}>
            <option value="">Any</option>
            {NICHES.map((n) => <option key={n} value={n}>{nicheLabel(n)}</option>)}
          </select>
        </label>
        <label className="text-xs font-semibold">Audience in<br />
          <select name="country" defaultValue={f.country} className={sel}>
            <option value="">Anywhere</option>
            {GEO_COUNTRIES.map((c) => <option key={c} value={c}>{countryName(c)}</option>)}
          </select>
        </label>
        <label className="text-xs font-semibold">Min clicks/month<br />
          <select name="min" defaultValue={String(f.minClicks)} className={sel}>
            {[0, 1000, 5000, 10000, 25000].map((n) => <option key={n} value={n}>{n ? n.toLocaleString() + "+" : "Any"}</option>)}
          </select>
        </label>
        <label className="flex items-center gap-1.5 pb-2 text-sm"><input type="checkbox" name="adult" value="1" defaultChecked={!f.noAdult} /> Include 18+ pages</label>
        <button className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-bold text-white">Filter</button>
      </form>

      <p className="text-sm font-semibold">{list.length} creator{list.length === 1 ? "" : "s"} match</p>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {list.map((c) => <CreatorCard key={c.id} c={c} />)}
      </div>
    </div>
  );
}

function CreatorCard({ c }: { c: Creator }) {
  const stat = (v: string, l: string) => (
    <div className="rounded-xl bg-stone-100 px-2 py-2 text-center"><p className="text-lg font-black leading-tight">{v}</p><p className="text-[11px] text-stone-600">{l}</p></div>
  );
  return (
    <article className="min-w-0 rounded-2xl border-2 border-stone-900 bg-white p-4">
      <div className="flex items-start gap-3">
        {c.avatar
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={c.avatar} alt="" className="h-12 w-12 shrink-0 rounded-full object-cover" />
          : <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-stone-200 text-lg font-black">{c.name[0]?.toUpperCase()}</div>}
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-x-2 font-bold">
            <span className="truncate">{c.name}</span>
            {c.sample && <span className="rounded-full bg-amber-200 px-2 py-0.5 text-[11px] font-bold">Sample</span>}
            {c.adult && <span className="rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-bold text-red-800">18+</span>}
          </p>
          <p className="truncate text-sm text-stone-600">{nicheLabel(c.niche)} · linksh.it/{c.handle}</p>
        </div>
      </div>
      {c.bio && <p className="mt-2 line-clamp-2 text-sm">{c.bio}</p>}

      <div className="mt-3 grid grid-cols-4 gap-1.5">
        {stat(short(c.views30), "views")}
        {stat(short(c.clicks30), "clicks")}
        {stat(`${ctr(c)}%`, "click rate")}
        {stat(`${c.mobilePct}%`, "on phones")}
      </div>

      <dl className="mt-3 space-y-1 text-sm">
        <div className="flex gap-2"><dt className="w-24 shrink-0 text-stone-500">Followers</dt><dd className="min-w-0">
          {c.followers.length ? c.followers.map((x) => (
            <span key={x.platform} className="mr-2 inline-block">{x.count ? <b>{short(x.count)}</b> : null} {x.url !== "#" ? <a href={x.url} target="_blank" rel="noreferrer" className="underline">{x.platform}</a> : x.platform}</span>
          )) : <span className="text-stone-500">None added</span>}
          {c.reach && <span className="block text-stone-600">&ldquo;{c.reach}&rdquo;</span>}
        </dd></div>
        <div className="flex gap-2"><dt className="w-24 shrink-0 text-stone-500">Top countries</dt><dd>{c.countries.length ? c.countries.map(countryName).join(", ") : "Not enough data"}</dd></div>
        <div className="flex gap-2"><dt className="w-24 shrink-0 text-stone-500">Track record</dt><dd>
          {c.offerClicks ? <>{c.offerClicks.toLocaleString()} offer clicks{c.offerSales !== null && <> · {c.offerSales} sales ({Math.round((100 * c.offerSales) / c.offerClicks)}%)</>}</> : "New to offers"}
        </dd></div>
      </dl>

      <div className="mt-3 flex gap-2">
        {c.sample
          ? <span className="flex-1 rounded-full border-2 border-stone-300 py-2 text-center text-sm font-bold text-stone-500">View page</span>
          : <a href={`/${c.handle}`} target="_blank" className="flex-1 rounded-full border-2 border-stone-900 py-2 text-center text-sm font-bold">View page ↗</a>}
        <span className="flex-1 rounded-full bg-stone-200 py-2 text-center text-sm font-bold text-stone-500" title="Pro access, later">Invite · Pro</span>
      </div>
    </article>
  );
}

export const instant = false;
