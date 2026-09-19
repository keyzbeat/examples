import type { Metadata } from "next";
import { VehicleGrid } from "@/components/vehicles/VehicleGrid";
import { isDemoMode } from "@/lib/demo";
import { company } from "@/data/company";

export const metadata: Metadata = {
  title: "Annonces — voitures d'occasion premium",
  description: `Découvrez les véhicules premium, luxe et sport sélectionnés par ${company.name} à Bordeaux.`,
  alternates: { canonical: "/annonces" },
  robots: isDemoMode ? { index: false, follow: false } : undefined,
};

export default function AnnoncesPage() {
  return (
    <div className="mx-auto max-w-6xl px-6 pb-24 pt-32">
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--color-accent)]">
        Notre sélection
      </p>
      <h1 className="mt-3 font-display text-4xl font-bold text-white sm:text-5xl">
        Toutes les annonces
      </h1>
      <p className="mt-4 max-w-xl text-white/60">
        Filtrez par marque, budget, énergie ou boîte de vitesses pour trouver
        votre prochaine exception.
      </p>

      <div className="mt-10">
        <VehicleGrid />
      </div>
    </div>
  );
}
