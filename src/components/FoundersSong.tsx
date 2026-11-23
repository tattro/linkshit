"use client";

import { useEffect, useRef, useState } from "react";

const SRC = "/audio/linksh-it-founders.mp3";

function fmt(s: number) {
  if (!Number.isFinite(s)) return "0:00";
  const m = Math.floor(s / 60);
  return `${m}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
}

export function FoundersSong() {
  const audio = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const a = audio.current;
    if (!a) return;
    const onTime = () => setTime(a.currentTime);
    const onMeta = () => setDuration(a.duration);
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("loadedmetadata", onMeta);
    a.addEventListener("play", onPlay);
    a.addEventListener("pause", onPause);
    a.addEventListener("ended", onPause);
    if (a.readyState >= 1) setDuration(a.duration);
    return () => {
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("loadedmetadata", onMeta);
      a.removeEventListener("play", onPlay);
      a.removeEventListener("pause", onPause);
      a.removeEventListener("ended", onPause);
    };
  }, []);

  function toggle() {
    const a = audio.current;
    if (!a) return;
    if (a.paused) a.play().catch(() => setPlaying(false));
    else a.pause();
  }

  function seek(e: React.ChangeEvent<HTMLInputElement>) {
    const a = audio.current;
    if (!a) return;
    a.currentTime = Number(e.target.value);
    setTime(a.currentTime);
  }

  const pct = duration ? (time / duration) * 100 : 0;

  return (
    <section aria-labelledby="founders-song" className="mx-auto max-w-5xl px-6 pb-24">
      <div className="-rotate-1 rounded-3xl border-4 border-stone-900 bg-white p-6 shadow-[6px_6px_0_0_#1c1917] md:flex md:items-center md:gap-6 md:p-8">
        <button
          type="button"
          onClick={toggle}
          aria-label={playing ? "Pause the founders" : "Play the founders"}
          className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-lime-300 text-2xl text-stone-900 ring-4 ring-stone-900 hover:bg-lime-400"
        >
          <span aria-hidden>{playing ? "❚❚" : "▶"}</span>
        </button>
        <div className="mt-4 min-w-0 flex-1 md:mt-0">
          <h2 id="founders-song" className="text-xl font-black tracking-tight md:text-2xl">
            Listen to the founders explain what Linksh.it is about
          </h2>
          <p className="mt-1 text-sm text-stone-500">
            We hired a world-class pitch team. They were busy, so we made a song instead.
          </p>
          <div className="mt-4 flex items-center gap-3">
            <input
              type="range"
              min={0}
              max={duration || 0}
              step={0.1}
              value={time}
              onChange={seek}
              aria-label="Seek"
              className="h-2 w-full cursor-pointer appearance-none rounded-full accent-stone-900"
              style={{ background: `linear-gradient(to right, #a3e635 ${pct}%, #e7e5e4 ${pct}%)` }}
            />
            <span className="shrink-0 text-xs font-semibold tabular-nums text-stone-500">
              {fmt(time)} / {fmt(duration)}
            </span>
          </div>
        </div>
        <audio ref={audio} src={SRC} preload="metadata" />
      </div>
    </section>
  );
}
