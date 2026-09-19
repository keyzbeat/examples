import { unlockDemo } from "./actions";
import { company } from "@/data/company";

export const metadata = {
  title: `Accès démo — ${company.name}`,
  robots: { index: false, follow: false },
};

export default async function EntreePage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const params = await searchParams;
  const next = params.next && params.next.startsWith("/") ? params.next : "/";
  const hasError = params.error === "1";

  return (
    <main className="flex min-h-screen items-center justify-center bg-black px-6 text-white">
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-white/5 p-8">
        <p className="text-xs uppercase tracking-[0.3em] text-white/40">
          Accès privé
        </p>
        <h1 className="mt-2 text-2xl font-semibold">Maquette de démonstration</h1>
        <p className="mt-2 text-sm text-white/60">
          Ce site est une proposition privée, non publique. Saisissez le mot
          de passe transmis pour continuer.
        </p>
        <form action={unlockDemo} className="mt-6 flex flex-col gap-3">
          <input type="hidden" name="next" value={next} />
          <label htmlFor="password" className="sr-only">
            Mot de passe
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            autoFocus
            className="min-h-11 rounded-lg border border-white/15 bg-black/40 px-4 py-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
            placeholder="Mot de passe"
          />
          {hasError ? (
            <p role="alert" className="text-sm text-red-400">
              Mot de passe incorrect.
            </p>
          ) : null}
          <button
            type="submit"
            className="min-h-11 rounded-lg bg-[var(--color-accent)] px-4 py-3 text-sm font-semibold text-black transition hover:brightness-110 focus-visible:ring-2 focus-visible:ring-white"
          >
            Entrer
          </button>
        </form>
      </div>
    </main>
  );
}
