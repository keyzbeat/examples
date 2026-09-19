import Link from "next/link";
import { company } from "@/data/company";
import { DemoFooterNote } from "./DemoBanner";

export function Footer() {
  return (
    <footer className="border-t border-white/10 bg-black">
      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-14 sm:grid-cols-3">
        <div>
          <p className="font-display text-lg font-bold text-white">
            Driv&apos;in <span className="text-[var(--color-accent)]">Bordeaux</span>
          </p>
          <p className="mt-3 max-w-xs text-sm text-white/60">
            {company.tagline}.
          </p>
        </div>
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-white/50">
            Adresse
          </h2>
          <p className="mt-3 text-sm text-white/70">
            {company.address.street}
            <br />
            {company.address.zone}
            <br />
            {company.address.postalCode} {company.address.city}
          </p>
        </div>
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-white/50">
            Navigation
          </h2>
          <ul className="mt-3 space-y-2 text-sm text-white/70">
            <li>
              <Link className="hover:text-[var(--color-accent)]" href="/annonces">
                Annonces
              </Link>
            </li>
            <li>
              <Link className="hover:text-[var(--color-accent)]" href="/contact">
                Contact
              </Link>
            </li>
          </ul>
        </div>
      </div>
      <DemoFooterNote />
    </footer>
  );
}
