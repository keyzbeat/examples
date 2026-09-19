"use client";

import { useEffect, useState } from "react";
import { slugToInitials } from "@/lib/format";

const ANGLES = ["Face avant", "Trois-quarts avant", "Profil", "Intérieur"];

export function Gallery({ slug }: { slug: string }) {
  const [index, setIndex] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    if (!fullscreen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setFullscreen(false);
      if (e.key === "ArrowRight") setIndex((i) => (i + 1) % ANGLES.length);
      if (e.key === "ArrowLeft")
        setIndex((i) => (i - 1 + ANGLES.length) % ANGLES.length);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [fullscreen]);

  const frame = (angleIndex: number, big = false) => (
    <div
      className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-[#1a1a20] via-[#0d0d11] to-black"
      style={{
        backgroundImage: `radial-gradient(circle at ${30 + angleIndex * 15}% 40%, rgba(248,147,3,0.12), transparent 60%)`,
      }}
    >
      <span
        aria-hidden="true"
        className={`font-display font-bold text-white/10 ${big ? "text-8xl" : "text-6xl"}`}
      >
        {slugToInitials(slug)}
      </span>
      <span
        aria-hidden="true"
        className="absolute left-3 top-3 rounded-full bg-black/60 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-white/70"
      >
        [DÉMO] {ANGLES[angleIndex]}
      </span>
    </div>
  );

  return (
    <div>
      <button
        type="button"
        onClick={() => setFullscreen(true)}
        data-cursor-hover
        aria-label="Agrandir la galerie photo"
        className="aspect-[16/10] w-full cursor-zoom-in"
      >
        {frame(index)}
      </button>

      <div className="mt-3 flex gap-2">
        {ANGLES.map((angle, i) => (
          <button
            key={angle}
            type="button"
            onClick={() => setIndex(i)}
            aria-pressed={index === i}
            aria-label={`Voir : ${angle}`}
            className={`h-14 w-20 shrink-0 overflow-hidden rounded-lg border transition ${
              index === i
                ? "border-[var(--color-accent)]"
                : "border-white/10 opacity-60 hover:opacity-100"
            }`}
          >
            {frame(i)}
          </button>
        ))}
      </div>

      {fullscreen ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Galerie plein écran"
          className="fixed inset-0 z-[95] flex flex-col bg-black/95 p-4 sm:p-10"
        >
          <button
            type="button"
            onClick={() => setFullscreen(false)}
            className="ml-auto min-h-11 min-w-11 rounded-full border border-white/20 px-4 text-white"
            aria-label="Fermer la galerie"
          >
            Fermer ✕
          </button>
          <div className="mt-4 flex-1">{frame(index, true)}</div>
          <div className="mt-4 flex items-center justify-center gap-4 text-white/70">
            <button
              type="button"
              onClick={() => setIndex((i) => (i - 1 + ANGLES.length) % ANGLES.length)}
              className="min-h-11 min-w-11 rounded-full border border-white/20 px-4"
              aria-label="Photo précédente"
            >
              ←
            </button>
            <span className="text-sm">{ANGLES[index]}</span>
            <button
              type="button"
              onClick={() => setIndex((i) => (i + 1) % ANGLES.length)}
              className="min-h-11 min-w-11 rounded-full border border-white/20 px-4"
              aria-label="Photo suivante"
            >
              →
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
