import type { Metadata } from "next";
import { Syne, Inter } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { DemoBadge } from "@/components/layout/DemoBanner";
import { SmoothScrollProvider } from "@/components/ui/SmoothScrollProvider";
import { CustomCursor } from "@/components/ui/CustomCursor";
import { company } from "@/data/company";
import { isDemoMode } from "@/lib/demo";

const syne = Syne({
  variable: "--font-syne",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://demo.drivinbordeaux.example";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: `${company.name} — Voitures d'occasion premium à Bordeaux`,
    template: `%s — ${company.name}`,
  },
  description: company.description,
  alternates: { canonical: "/" },
  robots: isDemoMode
    ? { index: false, follow: false, nocache: true }
    : { index: true, follow: true },
  openGraph: {
    type: "website",
    locale: "fr_FR",
    siteName: company.name,
    title: `${company.name} — Voitures d'occasion premium à Bordeaux`,
    description: company.description,
  },
};

const localBusinessJsonLd = {
  "@context": "https://schema.org",
  "@type": "AutoDealer",
  name: company.name,
  description: company.description,
  address: {
    "@type": "PostalAddress",
    streetAddress: `${company.address.street}, ${company.address.zone}`,
    postalCode: company.address.postalCode,
    addressLocality: company.address.city,
    addressCountry: "FR",
  },
  openingHoursSpecification: [
    {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      opens: "09:00",
      closes: "12:00",
    },
    {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      opens: "14:00",
      closes: "19:00",
    },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="fr"
      data-scroll-behavior="smooth"
      className={`${syne.variable} ${inter.variable} h-full`}
    >
      <body className="flex min-h-full flex-col bg-[var(--color-bg)] text-[var(--color-fg)] antialiased">
        {isDemoMode ? null : (
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessJsonLd) }}
          />
        )}
        <a
          href="#contenu"
          className="fixed left-4 top-4 z-[100] -translate-y-24 rounded-full bg-[var(--color-accent)] px-5 py-3 text-sm font-semibold text-black transition-transform focus-visible:translate-y-0"
        >
          Aller au contenu
        </a>
        <SmoothScrollProvider>
          <CustomCursor />
          <div aria-hidden="true" className="noise-overlay" />
          <Header />
          <main id="contenu" className="flex-1">
            {children}
          </main>
          <Footer />
          <DemoBadge />
        </SmoothScrollProvider>
      </body>
    </html>
  );
}
