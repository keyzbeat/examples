"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { VehicleCard } from "./VehicleCard";
import { FilterBar, type Filters } from "./FilterBar";
import {
  vehicles as allVehicles,
  priceRanges,
  getBrands,
  getEnergies,
  getGearboxFamilies,
  getGearboxFamily,
} from "@/lib/vehicles";

const defaultFilters: Filters = {
  brand: "all",
  priceRange: "all",
  energy: "all",
  gearbox: "all",
  sort: "recent",
};

export function VehicleGrid() {
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const brands = useMemo(() => getBrands(), []);
  const energies = useMemo(() => getEnergies(), []);
  const gearboxFamilies = useMemo(() => getGearboxFamilies(), []);

  const filtered = useMemo(() => {
    const range = priceRanges.find((r) => r.id === filters.priceRange) ?? priceRanges[0];

    const result = allVehicles.filter((vehicle) => {
      if (filters.brand !== "all" && vehicle.brand !== filters.brand) return false;
      if (filters.energy !== "all" && vehicle.energy !== filters.energy) return false;
      if (
        filters.gearbox !== "all" &&
        getGearboxFamily(vehicle.gearbox) !== filters.gearbox
      )
        return false;
      if (vehicle.price < range.min || vehicle.price >= range.max) return false;
      return true;
    });

    if (filters.sort === "price-asc") result.sort((a, b) => a.price - b.price);
    if (filters.sort === "price-desc") result.sort((a, b) => b.price - a.price);
    if (filters.sort === "recent")
      result.sort(
        (a, b) =>
          new Date(b.firstRegistration).getTime() -
          new Date(a.firstRegistration).getTime()
      );

    return result;
  }, [filters]);

  return (
    <div>
      <FilterBar
        brands={brands}
        energies={energies}
        gearboxFamilies={gearboxFamilies}
        filters={filters}
        onChange={setFilters}
        resultCount={filtered.length}
      />

      <h2 className="sr-only">Résultats</h2>
      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <AnimatePresence mode="popLayout">
          {filtered.map((vehicle) => (
            <motion.div
              key={vehicle.slug}
              layout
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            >
              <VehicleCard vehicle={vehicle} />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {filtered.length === 0 ? (
        <p className="mt-16 text-center text-white/50">
          Aucun véhicule ne correspond à ces critères.
        </p>
      ) : null}
    </div>
  );
}
