import { company } from "@/data/company";
import { RevealOnScroll } from "@/components/ui/RevealOnScroll";
import { MagneticLink } from "@/components/ui/MagneticButton";

export function ContactQuick() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-24">
      <RevealOnScroll>
        <div className="grid gap-10 rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.06] to-transparent p-10 sm:grid-cols-2 sm:p-14">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--color-accent)]">
              Nous rencontrer
            </p>
            <h2 className="mt-3 font-display text-3xl font-bold text-white">
              Bordeaux &amp; Gironde
            </h2>
            <p className="mt-4 text-sm text-white/60">
              {company.address.street}
              <br />
              {company.address.zone}
              <br />
              {company.address.postalCode} {company.address.city}
            </p>
            <MagneticLink
              href="/contact"
              className="mt-8 inline-flex min-h-11 items-center rounded-full bg-[var(--color-accent)] px-6 py-3 text-sm font-semibold text-black"
            >
              Prendre contact
            </MagneticLink>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/40">
              Horaires
            </p>
            <ul className="mt-4 space-y-3">
              {company.hours.map((slot) => (
                <li
                  key={slot.days}
                  className="flex items-center justify-between border-b border-white/10 pb-3 text-sm text-white/70"
                >
                  <span>{slot.days}</span>
                  <span className="text-white/50">{slot.hours}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </RevealOnScroll>
    </section>
  );
}
