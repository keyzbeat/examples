"use client";

import { useEffect, useState } from "react";
import gsap from "gsap";
import { usePrefersReducedMotion } from "@/lib/usePrefersReducedMotion";

export function Preloader() {
  const prefersReduced = usePrefersReducedMotion();
  const [progress, setProgress] = useState(0);
  const [animationDone, setAnimationDone] = useState(false);

  useEffect(() => {
    if (prefersReduced) return;

    const counter = { value: 0 };
    const tween = gsap.to(counter, {
      value: 100,
      duration: 1.3,
      ease: "power2.out",
      onUpdate: () => setProgress(Math.round(counter.value)),
      onComplete: () => {
        gsap.delayedCall(0.25, () => setAnimationDone(true));
      },
    });

    return () => {
      tween.kill();
    };
  }, [prefersReduced]);

  const displayProgress = prefersReduced ? 100 : progress;
  const hidden = prefersReduced || animationDone;

  return (
    <div
      aria-hidden={hidden}
      className={`fixed inset-0 z-[90] flex flex-col items-center justify-center bg-[#07070a] transition-opacity duration-500 ${
        hidden ? "pointer-events-none opacity-0" : "opacity-100"
      }`}
    >
      <p className="font-display text-sm uppercase tracking-[0.5em] text-white/50">
        Driv&apos;in Bordeaux
      </p>
      <p className="mt-6 font-display text-6xl font-bold text-white sm:text-7xl">
        {displayProgress}
        <span className="text-[var(--color-accent)]">%</span>
      </p>
      <div className="mt-6 h-px w-40 overflow-hidden bg-white/10">
        <div
          className="h-full bg-[var(--color-accent)] transition-[width] duration-150"
          style={{ width: `${displayProgress}%` }}
        />
      </div>
    </div>
  );
}
