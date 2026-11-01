"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

type Body = { el: HTMLElement; x: number; y: number; vx: number; vy: number; spin: number; r: number; left: number; top: number; w: number; h: number };

const rand = (min: number, max: number) => min + Math.random() * (max - min);
const velocity = () => (Math.random() < 0.5 ? -1 : 1) * rand(3, 9);

/** Sends every link and button on the page bouncing around, with 💩 for company. Returns a cleanup. */
function startChaos(): () => void {
  const root = document.documentElement;
  const prevOverflow = root.style.overflow;
  root.style.overflow = "hidden";

  const all = Array.from(document.querySelectorAll<HTMLElement>("main a, main button, main input, main textarea, main label, header a, header button, aside a"))
    .filter((el) => !el.closest("[data-chaos-safe]"));
  const targets = all.filter((el) => !all.some((other) => other !== el && other.contains(el)));
  const saved = targets.map((el) => [el, el.style.transform, el.style.transition, el.style.position, el.style.zIndex] as const);

  const bodies: Body[] = targets.map((el) => {
    const r = el.getBoundingClientRect();
    el.style.transition = "none";
    el.style.position = el.style.position || "relative";
    el.style.zIndex = "50";
    return { el, x: 0, y: 0, vx: velocity(), vy: velocity(), spin: rand(-4, 4), r: 0, left: r.left, top: r.top, w: r.width, h: r.height };
  });

  const poops: HTMLElement[] = [];
  for (let i = 0; i < 24; i++) {
    const p = document.createElement("span");
    p.textContent = "💩";
    p.setAttribute("aria-hidden", "true");
    const size = rand(28, 72);
    Object.assign(p.style, { position: "fixed", left: "0", top: "0", fontSize: `${size}px`, lineHeight: "1", zIndex: "60", pointerEvents: "none", userSelect: "none" });
    document.body.appendChild(p);
    poops.push(p);
    bodies.push({ el: p, x: rand(0, innerWidth - size), y: rand(0, innerHeight - size), vx: velocity(), vy: velocity(), spin: rand(-8, 8), r: 0, left: 0, top: 0, w: size, h: size });
  }

  let frame = 0;
  const tick = () => {
    const W = innerWidth, H = innerHeight;
    for (const b of bodies) {
      b.x += b.vx; b.y += b.vy; b.r += b.spin;
      const left = b.left + b.x, top = b.top + b.y;
      if (left < 0) b.vx = Math.abs(b.vx); else if (left + b.w > W) b.vx = -Math.abs(b.vx);
      if (top < 0) b.vy = Math.abs(b.vy); else if (top + b.h > H) b.vy = -Math.abs(b.vy);
      b.el.style.transform = `translate(${b.x}px, ${b.y}px) rotate(${b.r}deg)`;
    }
    frame = requestAnimationFrame(tick);
  };
  frame = requestAnimationFrame(tick);

  return () => {
    cancelAnimationFrame(frame);
    poops.forEach((p) => p.remove());
    for (const [el, transform, transition, position, z] of saved) {
      el.style.transform = transform; el.style.transition = transition; el.style.position = position; el.style.zIndex = z;
    }
    root.style.overflow = prevOverflow;
  };
}

export function ChaosToggle() {
  const [on, setOn] = useState(false);
  useEffect(() => {
    if (!on) return;
    const stop = startChaos();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOn(false); };
    addEventListener("keydown", onKey);
    return () => { stop(); removeEventListener("keydown", onKey); };
  }, [on]);

  return (
    <>
      <label className="flex cursor-pointer items-center gap-2 text-sm font-black text-red-600">
        <input type="checkbox" checked={on} onChange={(e) => setOn(e.target.checked)} className="h-5 w-5 accent-red-600" />
        Chaos mode (don&apos;t press this)
      </label>
      {on && createPortal(
        <div data-chaos-safe className="fixed inset-x-0 bottom-6 z-[70] flex justify-center">
          <button
            type="button"
            onClick={() => setOn(false)}
            className="rounded-full bg-red-600 px-6 py-3 font-black text-white shadow-2xl ring-4 ring-white hover:bg-red-700"
          >
            🧯 Make it stop
          </button>
        </div>,
        document.body,
      )}
    </>
  );
}
