import type { Vehicle } from "@/lib/vehicles";
import { formatPrice, formatMileage, formatDateFr } from "@/lib/format";

export function SpecTable({ vehicle }: { vehicle: Vehicle }) {
  const rows: [string, string][] = [
    ["Prix", formatPrice(vehicle.price)],
    ...(vehicle.priceHT
      ? ([[
          "Prix HT",
          `${formatPrice(vehicle.priceHT)}${vehicle.priceNote ? ` (${vehicle.priceNote})` : ""}`,
        ]] as [string, string][])
      : []),
    ["Mise en circulation", formatDateFr(vehicle.firstRegistration)],
    ["Kilométrage", formatMileage(vehicle.mileageKm)],
    ["Puissance", `${vehicle.power} ch`],
    ["Boîte de vitesses", vehicle.gearbox],
    ["Énergie", vehicle.energy],
    ["Couleur", vehicle.color],
    ...(vehicle.zeroToHundred
      ? ([["0 à 100 km/h", `${vehicle.zeroToHundred} s`]] as [string, string][])
      : []),
  ];

  return (
    <dl className="grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2">
      {rows.map(([label, value]) => (
        <div
          key={label}
          className="flex items-center justify-between border-b border-white/10 py-2 text-sm"
        >
          <dt className="text-white/50">{label}</dt>
          <dd className="font-medium text-white">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
