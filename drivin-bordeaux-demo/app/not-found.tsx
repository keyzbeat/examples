import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-xl flex-col items-center justify-center px-6 text-center">
      <p className="font-display text-6xl font-bold text-[var(--color-accent)]">404</p>
      <h1 className="mt-4 font-display text-2xl font-bold text-white">
        Cette page n&apos;existe pas
      </h1>
      <p className="mt-2 text-white/60">
        Le véhicule ou la page recherchée est introuvable.
      </p>
      <Link
        href="/"
        className="mt-8 min-h-11 rounded-full bg-[var(--color-accent)] px-6 py-3 text-sm font-semibold text-black"
      >
        Retour à l&apos;accueil
      </Link>
    </div>
  );
}
