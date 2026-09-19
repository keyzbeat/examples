import { company } from "@/data/company";
import { RevealOnScroll } from "@/components/ui/RevealOnScroll";

export function SoldSection() {
  return (
    <section className="border-y border-white/10 bg-black">
      <div className="mx-auto max-w-6xl px-6 py-24">
        <RevealOnScroll>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--color-accent)]">
            Déjà vendus
          </p>
          <h2 className="mt-3 max-w-2xl font-display text-3xl font-bold text-white sm:text-4xl">
            Elles ont déjà trouvé leur propriétaire
          </h2>
        </RevealOnScroll>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {company.soldVehicles.map((name, index) => (
            <RevealOnScroll key={name} delay={index * 0.06}>
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-white/40">
                  Vendu
                </p>
                <p className="mt-2 font-display text-base font-semibold text-white">
                  {name}
                </p>
              </div>
            </RevealOnScroll>
          ))}
        </div>
      </div>
    </section>
  );
}
