import vehiclesData from "@/data/vehicles.json";

export type Vehicle = {
  slug: string;
  brand: string;
  title: string;
  price: number;
  priceHT?: number;
  priceNote?: string;
  firstRegistration: string;
  mileageKm: number;
  power: number;
  gearbox: string;
  energy: string;
  color: string;
  zeroToHundred: number | null;
  featured: boolean;
  detailLevel: "full" | "light";
  highlights: string[];
};

export const vehicles: Vehicle[] = vehiclesData as Vehicle[];

export function getVehicleBySlug(slug: string): Vehicle | undefined {
  return vehicles.find((v) => v.slug === slug);
}

export function getFeaturedVehicles(limit = 4): Vehicle[] {
  return vehicles.filter((v) => v.featured).slice(0, limit);
}

export function getBrands(): string[] {
  return Array.from(new Set(vehicles.map((v) => v.brand))).sort();
}

export function getEnergies(): string[] {
  return Array.from(new Set(vehicles.map((v) => v.energy))).sort();
}

export type GearboxFamily = "Double embrayage (PDK/DCT)" | "Automatique" | "Séquentielle robotisée";

export function getGearboxFamily(gearbox: string): GearboxFamily {
  if (/PDK|DCT/i.test(gearbox)) return "Double embrayage (PDK/DCT)";
  if (/E-Gear|F1/i.test(gearbox)) return "Séquentielle robotisée";
  return "Automatique";
}

export function getGearboxFamilies(): GearboxFamily[] {
  return Array.from(new Set(vehicles.map((v) => getGearboxFamily(v.gearbox))));
}

export const priceRanges = [
  { id: "all", label: "Tous budgets", min: 0, max: Infinity },
  { id: "u90", label: "Jusqu'à 90 000 €", min: 0, max: 90000 },
  { id: "90-110", label: "90 000 – 110 000 €", min: 90000, max: 110000 },
  { id: "110-130", label: "110 000 – 130 000 €", min: 110000, max: 130000 },
  { id: "130plus", label: "Plus de 130 000 €", min: 130000, max: Infinity },
] as const;

export type PriceRangeId = (typeof priceRanges)[number]["id"];
