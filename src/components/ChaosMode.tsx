"use client";

import { useEffect, useRef, useState } from "react";

type Body = { el: HTMLElement; x: number; y: number; vx: number; vy: number; spin: number; r: number; left: number; top: number; w: number; h: number };

const rand = (min: number, max: number) => min + Math.random() * (max - min);
const velocity = () => (Math.random() < 0.5 ? -1 : 1) * rand(2.5, 8);

/**
 * Sends every link and button inside `root` bouncing around `bounds` (or the window), with 💩 for company.
 * Returns a cleanup that puts everything back.
 */
function startChaos(root: HTMLElement, boundsEl: HTMLElement | null): () => void {
  const scroller = boundsEl ?? document.documentElement;
  const prevOverflow = scroller.style.overflow;
  scroller.style.overflow = "hidden";
  const box = () => {
    if (!boundsEl) return { left: 0, top: 0, right: innerWidth, bottom: innerHeight };
    const r = boundsEl.getBoundingClientRect();
    return { left: r.left, top: r.top, right: r.right, bottom: r.bottom };
  };

  const all = Array.from(root.querySelectorAll<HTMLElement>("a, button, summary, form, iframe, ul.flex > li"))
    .filter((el) => !el.closest("[data-chaos-safe]"));
  const targets = all.filter((el) => !all.some((other) => other !== el && other.contains(el)));
  const saved = targets.map((el) => [el, el.style.transform, el.style.transition, el.style.position, el.style.zIndex] as const);

  const start = box();
  const bodies: Body[] = targets.map((el) => {
    const r = el.getBoundingClientRect();
    el.style.transition = "none";
    el.style.position = el.style.position || "relative";
    el.style.zIndex = "20";
    // Things below the fold start inside the box so they're on screen right away
    const y0 = r.top > start.bottom - r.height ? rand(start.top, Math.max(start.top, start.bottom - r.height)) - r.top : 0;
    return { el, x: 0, y: y0, vx: velocity(), vy: velocity(), spin: rand(-3, 3), r: 0, left: r.left, top: r.top, w: r.width, h: r.height };
  });

  const poops: HTMLElement[] = [];
  const count = boundsEl ? 10 : 20;
  for (let i = 0; i < count; i++) {
    const p = document.createElement("span");
    p.textContent = "💩";
    p.setAttribute("aria-hidden", "true");
    const size = rand(boundsEl ? 20 : 28, boundsEl ? 44 : 72);
    Object.assign(p.style, { position: "fixed", left: "0", top: "0", fontSize: `${size}px`, lineHeight: "1", zIndex: "30", pointerEvents: "none", userSelect: "none" });
    document.body.appendChild(p);
    poops.push(p);
    bodies.push({
      el: p, x: rand(start.left, start.right - size), y: rand(start.top, start.bottom - size),
      vx: velocity(), vy: velocity(), spin: rand(-8, 8), r: 0, left: 0, top: 0, w: size, h: size,
    });
  }

  let frame = 0;
  const tick = () => {
    const b0 = box();
    for (const b of bodies) {
      b.x += b.vx; b.y += b.vy; b.r += b.spin;
      const left = b.left + b.x, top = b.top + b.y;
      if (left < b0.left) b.vx = Math.abs(b.vx); else if (left + b.w > b0.right) b.vx = -Math.abs(b.vx);
      if (top < b0.top) b.vy = Math.abs(b.vy); else if (top + b.h > b0.bottom) b.vy = -Math.abs(b.vy);
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
    scroller.style.overflow = prevOverflow;
  };
}

/**
 * Chaos mode for a public page. Drop it inside the page; it takes over its parent.
 * Visitors who ask their device for reduced motion never see it, and anyone can calm it down.
 */
export function ChaosMode({ active }: { active: boolean }) {
  const marker = useRef<HTMLSpanElement>(null);
  const [calm, setCalm] = useState(false);
  const [preview, setPreview] = useState(false);
  useEffect(() => {
    const root = marker.current?.parentElement;
    if (!active || calm || !root) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const bounds = root.closest<HTMLElement>("[data-chaos-bounds]");
    setPreview(Boolean(bounds));
    let stop = () => {};
    // Let the page settle (fonts, images) before measuring
    const t = setTimeout(() => { stop = startChaos(root, bounds); }, 400);
    return () => { clearTimeout(t); stop(); };
  }, [active, calm]);

  return (
    <span ref={marker} data-chaos-safe className="contents">
      {active && !calm && !preview && (
        <button
          type="button"
          onClick={() => setCalm(true)}
          className="fixed bottom-3 right-3 z-40 rounded-full bg-black/70 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur"
        >
          🧯 calm down
        </button>
      )}
    </span>
  );
}
