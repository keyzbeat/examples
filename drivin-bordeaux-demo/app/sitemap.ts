import type { MetadataRoute } from "next";
import { isDemoMode } from "@/lib/demo";
import { vehicles } from "@/lib/vehicles";

export default function sitemap(): MetadataRoute.Sitemap {
  if (isDemoMode) return [];

  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.drivinbordeaux.fr";
  const staticRoutes = ["", "/annonces", "/contact"].map((path) => ({
    url: `${base}${path}`,
    lastModified: new Date(),
  }));
  const vehicleRoutes = vehicles.map((v) => ({
    url: `${base}/annonces/${v.slug}`,
    lastModified: new Date(),
  }));

  return [...staticRoutes, ...vehicleRoutes];
}
