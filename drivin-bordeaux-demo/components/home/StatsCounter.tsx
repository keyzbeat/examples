"use client";

import { useEffect, useRef, useState } from "react";
import { vehicles } from "@/lib/vehicles";
import { company } from "@/data/company";
import { usePrefersReducedMotion } from "@/lib/usePrefersReducedMotion";

const stats = [
  { value: vehicles.length, label: "Véhicules sélectionnés en ce moment" },
  { value: company.services.length, label: "Engagements & services proposés" },
  { value: company.soldVehicles.length, label: "Exceptions récemment trouvées" },
];

function Counter({ target }: { target: number }) {
  const prefersReduced = usePrefersReducedMotion();
  const [value, setValue] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (prefersReduced) return;
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        const start = performance.now();
        const duration = 900;
        function tick(now: number) {
          const progress = Math.min(1, (now - start) / duration);
          setValue(Math.round(progress * target));
          if (progress < 1) requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick);
      },
      { threshold: 0.4 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [target, prefersReduced]);

  return (
    <span ref={ref} className="font-display text-5xl font-bold text-white">
      {prefersReduced ? target : value}
    </span>
  );
}

export function StatsCounter() {
  return (
    <section className="border-y border-white/10 bg-white/[0.02]">
      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-16 sm:grid-cols-3">
        {stats.map((stat) => (
          <div key={stat.label}>
            <Counter target={stat.value} />
            <p className="mt-2 max-w-[220px] text-sm text-white/60">
              {stat.label}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
