"use client";

import { priceRanges, type PriceRangeId, type GearboxFamily } from "@/lib/vehicles";

export type SortOption = "price-asc" | "price-desc" | "recent";

export type Filters = {
  brand: string;
  priceRange: PriceRangeId;
  energy: string;
  gearbox: GearboxFamily | "all";
  sort: SortOption;
};

export function FilterBar({
  brands,
  energies,
  gearboxFamilies,
  filters,
  onChange,
  resultCount,
}: {
  brands: string[];
  energies: string[];
  gearboxFamilies: GearboxFamily[];
  filters: Filters;
  onChange: (next: Filters) => void;
  resultCount: number;
}) {
  const selectClass =
    "min-h-11 rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-sm text-white outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]";

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <label className="flex flex-col gap-1.5 text-xs text-white/50">
          Marque
          <select
            className={selectClass}
            value={filters.brand}
            onChange={(e) => onChange({ ...filters, brand: e.target.value })}
          >
            <option value="all">Toutes les marques</option>
            {brands.map((brand) => (
              <option key={brand} value={brand}>
                {brand}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1.5 text-xs text-white/50">
          Budget
          <select
            className={selectClass}
            value={filters.priceRange}
            onChange={(e) =>
              onChange({ ...filters, priceRange: e.target.value as PriceRangeId })
            }
          >
            {priceRanges.map((range) => (
              <option key={range.id} value={range.id}>
                {range.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1.5 text-xs text-white/50">
          Énergie
          <select
            className={selectClass}
            value={filters.energy}
            onChange={(e) => onChange({ ...filters, energy: e.target.value })}
          >
            <option value="all">Toutes énergies</option>
            {energies.map((energy) => (
              <option key={energy} value={energy}>
                {energy}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1.5 text-xs text-white/50">
          Boîte
          <select
            className={selectClass}
            value={filters.gearbox}
            onChange={(e) =>
              onChange({ ...filters, gearbox: e.target.value as Filters["gearbox"] })
            }
          >
            <option value="all">Toutes boîtes</option>
            {gearboxFamilies.map((family) => (
              <option key={family} value={family}>
                {family}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1.5 text-xs text-white/50">
          Trier par
          <select
            className={selectClass}
            value={filters.sort}
            onChange={(e) =>
              onChange({ ...filters, sort: e.target.value as SortOption })
            }
          >
            <option value="recent">Plus récentes</option>
            <option value="price-asc">Prix croissant</option>
            <option value="price-desc">Prix décroissant</option>
          </select>
        </label>
      </div>

      <p className="mt-4 text-sm text-white/50">
        {resultCount} véhicule{resultCount > 1 ? "s" : ""}
      </p>
    </div>
  );
}
