import Link from "next/link";
import { getFeaturedVehicles } from "@/lib/vehicles";
import { VehicleCard } from "@/components/vehicles/VehicleCard";
import { RevealOnScroll } from "@/components/ui/RevealOnScroll";

export function ListingsPreview() {
  const vehicles = getFeaturedVehicles(4);

  return (
    <section className="mx-auto max-w-6xl px-6 py-24">
      <RevealOnScroll>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--color-accent)]">
              Dernières annonces
            </p>
            <h2 className="mt-3 font-display text-3xl font-bold text-white sm:text-4xl">
              Une sélection d&apos;exception
            </h2>
          </div>
          <Link
            href="/annonces"
            data-cursor-hover
            className="min-h-11 rounded-full border border-white/15 px-5 py-2.5 text-sm font-medium text-white/80 transition hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
          >
            Toutes les annonces
          </Link>
        </div>
      </RevealOnScroll>

      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {vehicles.map((vehicle, i) => (
          <RevealOnScroll key={vehicle.slug} delay={i * 0.08}>
            <VehicleCard vehicle={vehicle} />
          </RevealOnScroll>
        ))}
      </div>
    </section>
  );
}
