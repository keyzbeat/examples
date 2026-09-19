import { company } from "@/data/company";
import { RevealOnScroll } from "@/components/ui/RevealOnScroll";

export function ServicesSection() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-24">
      <RevealOnScroll>
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--color-accent)]">
          Services &amp; engagements
        </p>
        <h2 className="mt-3 max-w-2xl font-display text-3xl font-bold text-white sm:text-4xl">
          Un accompagnement complet, du choix à la route
        </h2>
      </RevealOnScroll>

      <ol className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {company.services.map((service, index) => (
          <RevealOnScroll
            as="li"
            key={service.title}
            delay={(index % 3) * 0.06}
            className="h-full rounded-2xl border border-white/10 bg-white/[0.03] p-6"
          >
            <span className="font-display text-sm font-bold text-[var(--color-accent)]">
              {String(index + 1).padStart(2, "0")}
            </span>
            <h3 className="mt-3 font-display text-lg font-semibold text-white">
              {service.title}
            </h3>
            <p className="mt-2 text-sm text-white/60">{service.description}</p>
          </RevealOnScroll>
        ))}
      </ol>
    </section>
  );
}
