"use client";

import { useEffect, useRef, useState } from "react";

const VIEW = 280; // size of the crop box on screen, px
const OUT = 400; // size of the saved photo, px
const MAX_ZOOM = 4;
const SMALLEST = 0.3; // zoomed all the way out, the photo's long side is 30% of the box

type Pt = { x: number; y: number };

/** Drag to move, pinch / scroll / slider to zoom. Calls onDone with a square WebP of what's in the circle. */
export function AvatarCropper({ file, onCancel, onDone }: { file: File; onCancel: () => void; onDone: (blob: Blob) => void }) {
  const [bitmap, setBitmap] = useState<ImageBitmap | null>(null);
  const [src, setSrc] = useState("");
  const [error, setError] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pos, setPos] = useState<Pt>({ x: 0, y: 0 });
  const pointers = useRef(new Map<number, Pt>());
  const pinch = useRef<{ dist: number; zoom: number } | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    let live = true;
    createImageBitmap(file).then((b) => {
      if (!live) return;
      setBitmap(b);
      setSrc(url);
      const s = VIEW / Math.min(b.width, b.height);
      setPos({ x: (VIEW - b.width * s) / 2, y: (VIEW - b.height * s) / 2 });
    }, () => live && setError(true));
    return () => { live = false; URL.revokeObjectURL(url); };
  }, [file]);

  const base = bitmap ? VIEW / Math.min(bitmap.width, bitmap.height) : 1;
  const scale = base * zoom;

  // Zoomed out past "fills the circle" is fine: the gaps stay see-through and show the page background
  const minZoom = bitmap ? Math.ceil(((SMALLEST * VIEW) / Math.max(bitmap.width, bitmap.height) / base) * 100) / 100 : 1;

  // Bigger than the box on an axis: no gaps on that axis. Smaller: stay inside the box.
  const clampAxis = (v: number, size: number) => (size >= VIEW ? Math.min(0, Math.max(VIEW - size, v)) : Math.min(VIEW - size, Math.max(0, v)));
  const clamp = (p: Pt, s: number): Pt => bitmap ? { x: clampAxis(p.x, bitmap.width * s), y: clampAxis(p.y, bitmap.height * s) } : p;

  function zoomTo(next: number, around: Pt = { x: VIEW / 2, y: VIEW / 2 }) {
    const z = Math.min(MAX_ZOOM, Math.max(minZoom, next));
    const s2 = base * z;
    setPos((p) => clamp({ x: around.x - (around.x - p.x) * (s2 / scale), y: around.y - (around.y - p.y) * (s2 / scale) }, s2));
    setZoom(z);
  }

  const local = (e: { clientX: number; clientY: number }): Pt => {
    const r = boxRef.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  function onPointerDown(e: React.PointerEvent) {
    e.currentTarget.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, local(e));
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinch.current = { dist: Math.hypot(a.x - b.x, a.y - b.y), zoom };
    }
  }

  function onPointerMove(e: React.PointerEvent) {
    const prev = pointers.current.get(e.pointerId);
    if (!prev) return;
    const now = local(e);
    pointers.current.set(e.pointerId, now);
    if (pointers.current.size === 2 && pinch.current) {
      const [a, b] = [...pointers.current.values()];
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      zoomTo(pinch.current.zoom * (Math.hypot(a.x - b.x, a.y - b.y) / pinch.current.dist), mid);
    } else if (pointers.current.size === 1) {
      setPos((p) => clamp({ x: p.x + now.x - prev.x, y: p.y + now.y - prev.y }, scale));
    }
  }

  function onPointerUp(e: React.PointerEvent) {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
  }

  async function save() {
    if (!bitmap) return;
    // Map the box onto the output square; anything outside the photo stays transparent
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = Math.max(64, Math.min(OUT, Math.round(VIEW / scale)));
    const k = canvas.width / VIEW;
    canvas.getContext("2d")!.drawImage(bitmap, pos.x * k, pos.y * k, bitmap.width * scale * k, bitmap.height * scale * k);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/webp", 0.85));
    if (blob) onDone(blob);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/70 p-4" role="dialog" aria-modal="true" aria-label="Crop your photo">
      <div className="w-full max-w-sm rounded-2xl border-2 border-stone-900 bg-white p-5 text-center shadow-xl">
        <h2 className="text-lg font-black">Line it up</h2>
        <p className="text-sm text-stone-500">Drag to move. Pinch or use the slider to zoom. Zoom out as far as you like: empty space shows your page&apos;s background.</p>
        {error ? (
          <p className="my-8 text-sm text-red-600">Couldn&apos;t read that image. Try a JPG or PNG.</p>
        ) : (
          <div
            ref={boxRef}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            onWheel={(e) => zoomTo(zoom * (e.deltaY < 0 ? 1.08 : 1 / 1.08), local(e))}
            className="relative mx-auto mt-4 cursor-grab touch-none select-none overflow-hidden rounded-xl active:cursor-grabbing"
            style={{ width: VIEW, height: VIEW, background: "repeating-conic-gradient(#e7e5e4 0 25%, #fafaf9 0 50%) 0 0 / 20px 20px" }}
          >
            {src && bitmap && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={src}
                alt=""
                draggable={false}
                className="pointer-events-none absolute left-0 top-0 max-w-none origin-top-left"
                style={{ width: bitmap.width * scale, height: bitmap.height * scale, transform: `translate(${pos.x}px, ${pos.y}px)` }}
              />
            )}
            {/* Dim everything outside the circle that ends up on the page */}
            <div className="pointer-events-none absolute inset-0 rounded-full shadow-[0_0_0_9999px_rgba(28,25,23,0.55)]" />
            <div className="pointer-events-none absolute inset-0 rounded-full border-2 border-white/80" />
          </div>
        )}
        <label className="mt-4 flex items-center gap-3 text-sm">
          <span aria-hidden>➖</span>
          <input
            type="range"
            min={minZoom}
            max={MAX_ZOOM}
            step={0.01}
            value={zoom}
            onChange={(e) => zoomTo(Number(e.target.value))}
            aria-label="Zoom"
            className="flex-1 accent-lime-500"
          />
          <span aria-hidden>➕</span>
        </label>
        <div className="mt-4 flex gap-2">
          <button type="button" onClick={onCancel} className="flex-1 rounded-lg border-2 border-stone-300 px-4 py-2 font-semibold hover:border-stone-900">Cancel</button>
          <button type="button" disabled={!bitmap} onClick={save} className="flex-1 rounded-lg bg-stone-900 px-4 py-2 font-semibold text-white hover:bg-lime-500 hover:text-stone-900 disabled:opacity-50">Use photo</button>
        </div>
      </div>
    </div>
  );
}
