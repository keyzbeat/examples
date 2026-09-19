import Link from "next/link";
import { company } from "@/data/company";

const navLinks = [
  { href: "/", label: "Accueil" },
  { href: "/annonces", label: "Annonces" },
  { href: "/contact", label: "Contact" },
];

export function Header() {
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-white/5 bg-black/40 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link
          href="/"
          className="font-display text-lg font-bold tracking-tight text-white"
        >
          Driv&apos;in <span className="text-[var(--color-accent)]">Bordeaux</span>
        </Link>
        <nav aria-label="Navigation principale" className="hidden gap-8 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="min-h-11 py-1 text-sm text-white/80 transition hover:text-[var(--color-accent)]"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <span
          className="hidden min-h-11 items-center rounded-full border border-[var(--color-accent)]/60 px-4 py-2 text-sm font-medium text-[var(--color-accent)] sm:inline-flex"
        >
          {company.contact.phoneDisplay}
        </span>
      </div>
    </header>
  );
}
