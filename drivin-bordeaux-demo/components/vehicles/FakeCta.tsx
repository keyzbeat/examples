"use client";

import { useState } from "react";

/**
 * Boutons factices : aucun envoi réel, aucune collecte, aucun appel réseau.
 * Affiche uniquement un message de confirmation de démonstration.
 */
export function FakeCta() {
  const [message, setMessage] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          data-cursor-hover
          onClick={() =>
            setMessage(
              "[DÉMO] Demande de rappel simulée : aucune donnée n'a été envoyée."
            )
          }
          className="min-h-11 rounded-full bg-[var(--color-accent)] px-6 py-3 text-sm font-semibold text-black transition hover:brightness-110"
        >
          Être rappelé
        </button>
        <button
          type="button"
          data-cursor-hover
          onClick={() =>
            setMessage(
              "[DÉMO] Demande d'essai simulée : aucune donnée n'a été envoyée."
            )
          }
          className="min-h-11 rounded-full border border-white/20 px-6 py-3 text-sm font-semibold text-white transition hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
        >
          Demander un essai
        </button>
      </div>
      <p role="status" aria-live="polite" className="min-h-5 text-sm text-white/60">
        {message}
      </p>
    </div>
  );
}
