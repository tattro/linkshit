"use client";

import { useEffect, useRef, useState } from "react";

const VIEW = 280; // size of the crop box on screen, px
const OUT = 400; // size of the saved photo, px
const MAX_ZOOM = 4;
const SMALLEST = 0.3; // zoomed all the way out, the photo's long side is 30% of the box

const FEATHER = 0.78; // the sharp photo starts fading out at 78% of the way to its edge

type Pt = { x: number; y: number };

/** A blurry copy of the photo that covers a size×size square (shrink a lot, then scale back up). */
function blurredCover(bitmap: ImageBitmap, size: number) {
  const step = (src: CanvasImageSource, w: number, h: number, dw: number) => {
    const c = document.createElement("canvas");
    c.width = c.height = dw;
    const ctx = c.getContext("2d")!;
    ctx.imageSmoothingQuality = "high";
    const s = dw / Math.min(w, h);
    ctx.drawImage(src, (dw - w * s) / 2, (dw - h * s) / 2, w * s, h * s);
    return c;
  };
  const tiny = step(bitmap, bitmap.width, bitmap.height, 12);
  const mid = step(tiny, 12, 12, 48);
  return step(mid, 48, 48, size);
}

/** The photo with its edges faded out in an oval, so it melts into the blur behind it. */
function featheredPhoto(bitmap: ImageBitmap, w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  const ctx = c.getContext("2d")!;
  ctx.drawImage(bitmap, 0, 0, c.width, c.height);
  ctx.globalCompositeOperation = "destination-in";
  ctx.translate(c.width / 2, c.height / 2);
  ctx.scale(c.width / 2, c.height / 2);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
  g.addColorStop(FEATHER, "rgba(0,0,0,1)");
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.fillRect(-1, -1, 2, 2);
  return c;
}

/** Drag to move, pinch / scroll / slider to zoom. Calls onDone with a square WebP of what's in the circle. */
export function AvatarCropper({ file, onCancel, onDone }: { file: File; onCancel: () => void; onDone: (blob: Blob) => void }) {
  const [bitmap, setBitmap] = useState<ImageBitmap | null>(null);
  const [src, setSrc] = useState("");
  const [error, setError] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pos, setPos] = useState<Pt>({ x: 0, y: 0 });
  const [blurFill, setBlurFill] = useState(true);
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
  // Zoomed out far enough that the photo no longer covers the box
  const gaps = bitmap ? bitmap.width * scale < VIEW - 0.5 || bitmap.height * scale < VIEW - 0.5 : false;
  const blurring = gaps && blurFill;

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
    const ctx = canvas.getContext("2d")!;
    const w = bitmap.width * scale * k, h = bitmap.height * scale * k;
    if (blurring) {
      ctx.drawImage(blurredCover(bitmap, canvas.width), 0, 0);
      ctx.drawImage(featheredPhoto(bitmap, w, h), pos.x * k, pos.y * k, w, h);
    } else {
      ctx.drawImage(bitmap, pos.x * k, pos.y * k, w, h);
    }
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/webp", 0.85));
    if (blob) onDone(blob);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/70 p-4" role="dialog" aria-modal="true" aria-label="Crop your photo">
      <div className="w-full max-w-sm rounded-2xl border-2 border-stone-900 bg-white p-5 text-center shadow-xl">
        <h2 className="text-lg font-black">Line it up</h2>
        <p className="text-sm text-stone-500">Drag to move. Pinch or use the slider to zoom. Zoom out as far as you like and we&apos;ll round it off with a blur.</p>
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
            {src && blurring && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={src} alt="" draggable={false} className="pointer-events-none absolute inset-0 h-full w-full scale-125 object-cover blur-xl" />
            )}
            {src && bitmap && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={src}
                alt=""
                draggable={false}
                className="pointer-events-none absolute left-0 top-0 max-w-none origin-top-left"
                style={{
                  width: bitmap.width * scale,
                  height: bitmap.height * scale,
                  transform: `translate(${pos.x}px, ${pos.y}px)`,
                  ...(blurring ? { maskImage: `radial-gradient(closest-side, #000 ${FEATHER * 100}%, transparent 100%)`, WebkitMaskImage: `radial-gradient(closest-side, #000 ${FEATHER * 100}%, transparent 100%)` } : {}),
                }}
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
        {gaps && (
          <label className="mt-3 flex items-center justify-center gap-2 text-sm">
            <input type="checkbox" checked={blurFill} onChange={(e) => setBlurFill(e.target.checked)} className="h-4 w-4 accent-lime-500" />
            Fill the circle with a blur of my photo
          </label>
        )}
        <div className="mt-4 flex gap-2">
          <button type="button" onClick={onCancel} className="flex-1 rounded-lg border-2 border-stone-300 px-4 py-2 font-semibold hover:border-stone-900">Cancel</button>
          <button type="button" disabled={!bitmap} onClick={save} className="flex-1 rounded-lg bg-stone-900 px-4 py-2 font-semibold text-white hover:bg-lime-500 hover:text-stone-900 disabled:opacity-50">Use photo</button>
        </div>
      </div>
    </div>
  );
}
