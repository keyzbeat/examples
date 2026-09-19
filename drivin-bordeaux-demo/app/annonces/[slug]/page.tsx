import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getVehicleBySlug, vehicles } from "@/lib/vehicles";
import { formatPrice } from "@/lib/format";
import { Gallery } from "@/components/vehicles/Gallery";
import { SpecTable } from "@/components/vehicles/SpecTable";
import { FakeCta } from "@/components/vehicles/FakeCta";
import { isDemoMode } from "@/lib/demo";
import { company } from "@/data/company";

export function generateStaticParams() {
  return vehicles.map((vehicle) => ({ slug: vehicle.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const vehicle = getVehicleBySlug(slug);
  if (!vehicle) return {};

  const description = `${vehicle.title} — ${formatPrice(vehicle.price)}, ${vehicle.mileageKm.toLocaleString("fr-FR")} km, ${vehicle.power} ch. Disponible chez ${company.name} à Bordeaux.`;

  return {
    title: vehicle.title,
    description,
    alternates: { canonical: `/annonces/${vehicle.slug}` },
    robots: isDemoMode ? { index: false, follow: false } : undefined,
    openGraph: { title: vehicle.title, description },
  };
}

export default async function VehiclePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const vehicle = getVehicleBySlug(slug);
  if (!vehicle) notFound();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Vehicle",
    name: vehicle.title,
    brand: vehicle.brand,
    vehicleModelDate: vehicle.firstRegistration.slice(0, 4),
    mileageFromOdometer: {
      "@type": "QuantitativeValue",
      value: vehicle.mileageKm,
      unitCode: "KMT",
    },
    fuelType: vehicle.energy,
    vehicleTransmission: vehicle.gearbox,
    color: vehicle.color,
    offers: {
      "@type": "Offer",
      price: vehicle.price,
      priceCurrency: "EUR",
      availability: "https://schema.org/InStock",
      seller: { "@type": "AutoDealer", name: company.name },
    },
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Accueil", item: "/" },
      { "@type": "ListItem", position: 2, name: "Annonces", item: "/annonces" },
      { "@type": "ListItem", position: 3, name: vehicle.title },
    ],
  };

  return (
    <div className="mx-auto max-w-6xl px-6 pb-24 pt-32">
      <nav aria-label="Fil d'ariane" className="text-xs text-white/60">
        <Link href="/" className="hover:text-white">
          Accueil
        </Link>{" "}
        /{" "}
        <Link href="/annonces" className="hover:text-white">
          Annonces
        </Link>{" "}
        / <span className="text-white/70">{vehicle.brand}</span>
      </nav>

      <div className="mt-6 grid gap-10 lg:grid-cols-[1.2fr_1fr]">
        <div>
          <Gallery slug={vehicle.slug} />
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--color-accent)]">
            {vehicle.brand}
          </p>
          <h1 className="mt-2 font-display text-3xl font-bold leading-tight text-white sm:text-4xl">
            {vehicle.title}
          </h1>
          <p className="mt-4 font-display text-3xl font-bold text-white">
            {formatPrice(vehicle.price)}
          </p>

          <div className="mt-8">
            <SpecTable vehicle={vehicle} />
          </div>

          {vehicle.highlights.length > 0 ? (
            <div className="mt-8">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-white/50">
                Points forts
              </h2>
              <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                {vehicle.highlights.map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-2 text-sm text-white/70"
                  >
                    <span aria-hidden="true" className="mt-1 text-[var(--color-accent)]">
                      ▸
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="mt-10">
            <FakeCta />
          </div>
        </div>
      </div>

      {isDemoMode ? null : (
        <>
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
          />
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
          />
        </>
      )}
    </div>
  );
}
