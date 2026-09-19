import type { Metadata } from "next";
import { company } from "@/data/company";
import { ContactForm } from "@/components/contact/ContactForm";
import { isDemoMode } from "@/lib/demo";

export const metadata: Metadata = {
  title: "Contact",
  description: `Contactez ${company.name} : adresse, horaires et prise de rendez-vous à Blanquefort, Gironde.`,
  alternates: { canonical: "/contact" },
  robots: isDemoMode ? { index: false, follow: false } : undefined,
};

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-5xl px-6 pb-24 pt-32">
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--color-accent)]">
        Contact
      </p>
      <h1 className="mt-3 font-display text-4xl font-bold text-white sm:text-5xl">
        Parlons de votre prochaine voiture
      </h1>

      <div className="mt-12 grid gap-10 lg:grid-cols-[1fr_1fr]">
        <ContactForm />

        <div className="flex flex-col gap-8">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-white/50">
              Adresse
            </h2>
            <p className="mt-2 text-white/80">
              {company.address.street}
              <br />
              {company.address.zone}
              <br />
              {company.address.postalCode} {company.address.city}
            </p>
          </div>

          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-white/50">
              Horaires
            </h2>
            <ul className="mt-2 space-y-2">
              {company.hours.map((slot) => (
                <li
                  key={slot.days}
                  className="flex items-center justify-between border-b border-white/10 py-2 text-sm text-white/70"
                >
                  <span>{slot.days}</span>
                  <span className="text-white/50">{slot.hours}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-white/50">
              Coordonnées [DÉMO]
            </h2>
            <p className="mt-2 text-sm text-white/50">
              {company.contact.phoneDisplay} · {company.contact.emailDisplay}
              <br />
              <span className="text-white/30">
                Valeurs neutres de démonstration, non cliquables.
              </span>
            </p>
          </div>

          {/* [DÉMO] Carte statique de repli, aucune requête vers un service tiers */}
          <div
            role="img"
            aria-label={`Localisation approximative : ${company.address.city}`}
            className="relative flex h-56 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#151519] to-black"
          >
            <span className="text-sm text-white/40">
              [DÉMO] Carte — {company.address.city}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
