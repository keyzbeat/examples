"use client";

import { useRef } from "react";
import Link from "next/link";
import type { Vehicle } from "@/lib/vehicles";
import { formatPrice, formatMileage, slugToInitials } from "@/lib/format";

export function VehicleCard({ vehicle }: { vehicle: Vehicle }) {
  const cardRef = useRef<HTMLDivElement>(null);

  function handleMove(e: React.MouseEvent<HTMLDivElement>) {
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    const el = cardRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    el.style.transform = `perspective(800px) rotateX(${-py * 6}deg) rotateY(${px * 8}deg) translateY(-4px)`;
  }

  function handleLeave() {
    if (cardRef.current) {
      cardRef.current.style.transform =
        "perspective(800px) rotateX(0) rotateY(0) translateY(0)";
    }
  }

  return (
    <Link
      href={`/annonces/${vehicle.slug}`}
      data-cursor-hover
      className="group block"
    >
      <div
        ref={cardRef}
        onMouseMove={handleMove}
        onMouseLeave={handleLeave}
        className="overflow-hidden rounded-2xl border border-white/10 bg-white/5 transition-[transform,border-color] duration-200 ease-out will-change-transform hover:border-[var(--color-accent)]/50"
      >
        {/* [DÉMO] Aucune photo fournie pour cette annonce : visuel de repli généré. */}
        <div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden bg-gradient-to-br from-[#15151b] via-[#0c0c10] to-black">
          <span className="font-display text-5xl font-bold text-white/10">
            {slugToInitials(vehicle.slug)}
          </span>
          <span className="absolute right-3 top-3 rounded-full bg-black/60 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-white/70">
            [DÉMO] visuel
          </span>
        </div>
        <div className="p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--color-accent)]">
            {vehicle.brand}
          </p>
          <h3 className="mt-1 font-display text-lg font-semibold leading-snug text-white">
            {vehicle.title}
          </h3>
          <div className="mt-3 flex items-center justify-between text-sm text-white/60">
            <span>{formatMileage(vehicle.mileageKm)}</span>
            <span>{vehicle.power} ch</span>
          </div>
          <p className="mt-4 font-display text-xl font-bold text-white">
            {formatPrice(vehicle.price)}
          </p>
        </div>
      </div>
    </Link>
  );
}
