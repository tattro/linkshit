"use client";

import { useState } from "react";

type Point = { date: string; value: number };

const W = 640, H = 180, PAD_L = 36, PAD_B = 22, PAD_T = 8;
const BAR = "#4d7c0f"; // lime-700: ≥3:1 against white for non-text marks

function niceMax(v: number) {
  if (v <= 4) return 4;
  const pow = 10 ** Math.floor(Math.log10(v));
  const step = [1, 2, 2.5, 5, 10].find((s) => s * pow * 4 >= v)! * pow;
  return step * 4;
}

const fmtDay = (iso: string, opts: Intl.DateTimeFormatOptions) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString([], { timeZone: "UTC", ...opts });

/** Single-series daily column chart with hover tooltip and a table fallback. */
export function DailyChart({ title, unit, data }: { title: string; unit: string; data: Point[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = niceMax(Math.max(0, ...data.map((d) => d.value)));
  const plotW = W - PAD_L, plotH = H - PAD_B - PAD_T;
  const slot = plotW / data.length;
  const barW = Math.min(24, Math.max(2, slot - 2)); // 2px surface gap between bars
  const y = (v: number) => PAD_T + plotH - (v / max) * plotH;
  const ticks = [0, max / 2, max];
  const labelEvery = Math.ceil(data.length / 6);
  const total = data.reduce((n, d) => n + d.value, 0);
  const h = hover !== null ? data[hover] : null;

  return (
    <figure className="m-0">
      <figcaption className="mb-2 flex items-baseline justify-between">
        <span className="font-semibold">{title}</span>
        <span className="text-sm text-stone-500">{total.toLocaleString()} total</span>
      </figcaption>
      <div className="relative">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={`${title}: ${total} ${unit} over ${data.length} days`} onMouseLeave={() => setHover(null)}>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={PAD_L} x2={W} y1={y(t)} y2={y(t)} stroke="#e7e5e4" strokeWidth={1} />
              <text x={PAD_L - 6} y={y(t)} dy="0.32em" textAnchor="end" className="fill-stone-500 text-[11px] tabular-nums">
                {t.toLocaleString()}
              </text>
            </g>
          ))}
          {data.map((d, i) => {
            const x = PAD_L + i * slot + (slot - barW) / 2;
            const top = y(d.value);
            const bh = PAD_T + plotH - top;
            const r = Math.min(4, bh, barW / 2);
            return (
              <g key={d.date}>
                {d.value > 0 && (
                  <path
                    d={`M${x},${top + bh} V${top + r} Q${x},${top} ${x + r},${top} H${x + barW - r} Q${x + barW},${top} ${x + barW},${top + r} V${top + bh} Z`}
                    fill={BAR}
                    opacity={hover === null || hover === i ? 1 : 0.45}
                  />
                )}
                {i % labelEvery === 0 && (
                  <text x={x + barW / 2} y={H - 6} textAnchor="middle" className="fill-stone-500 text-[11px]">
                    {fmtDay(d.date, { month: "short", day: "numeric" })}
                  </text>
                )}
                {/* Full-height hit target, wider than the bar */}
                <rect x={PAD_L + i * slot} y={PAD_T} width={slot} height={plotH} fill="transparent" onMouseEnter={() => setHover(i)} />
              </g>
            );
          })}
        </svg>
        {h && hover !== null && (
          <div
            className="pointer-events-none absolute top-0 -translate-x-1/2 rounded-lg bg-stone-900 px-2.5 py-1.5 text-xs whitespace-nowrap text-white shadow"
            style={{ left: `${((PAD_L + hover * slot + slot / 2) / W) * 100}%` }}
          >
            <div className="text-stone-300">{fmtDay(h.date, { weekday: "short", month: "short", day: "numeric" })}</div>
            <div className="font-semibold">{h.value.toLocaleString()} {unit}</div>
          </div>
        )}
      </div>
      <details className="mt-1 text-sm">
        <summary className="cursor-pointer text-stone-500">Show as table</summary>
        <table className="mt-2 w-full text-left tabular-nums">
          <thead><tr className="text-stone-500"><th className="font-medium">Day</th><th className="text-right font-medium">{unit}</th></tr></thead>
          <tbody>
            {data.map((d) => (
              <tr key={d.date} className="border-t border-stone-100">
                <td>{fmtDay(d.date, { month: "short", day: "numeric" })}</td>
                <td className="text-right">{d.value.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}
