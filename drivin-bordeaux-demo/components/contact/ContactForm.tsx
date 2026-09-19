"use client";

import { useState, type FormEvent } from "react";

/**
 * Formulaire 100% factice : aucun envoi réseau, aucune collecte de données.
 * onSubmit empêche uniquement le comportement par défaut et affiche une
 * confirmation de démonstration.
 */
export function ContactForm() {
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div
        role="status"
        className="rounded-2xl border border-[var(--color-accent)]/40 bg-[var(--color-accent)]/10 p-6 text-white"
      >
        <p className="font-display text-lg font-semibold">
          [DÉMO] Message simulé envoyé
        </p>
        <p className="mt-2 text-sm text-white/70">
          Ceci est une maquette : aucune donnée n&apos;a été transmise ni
          conservée.
        </p>
      </div>
    );
  }

  const fieldClass =
    "min-h-11 rounded-lg border border-white/15 bg-black/40 px-4 py-3 text-sm text-white outline-none placeholder:text-white/30 focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]";

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-xs text-white/50">
          Nom
          <input className={fieldClass} name="name" type="text" placeholder="Votre nom" />
        </label>
        <label className="flex flex-col gap-1.5 text-xs text-white/50">
          Téléphone
          <input
            className={fieldClass}
            name="phone"
            type="tel"
            placeholder="06 00 00 00 00"
          />
        </label>
      </div>
      <label className="flex flex-col gap-1.5 text-xs text-white/50">
        E-mail
        <input className={fieldClass} name="email" type="email" placeholder="vous@exemple.fr" />
      </label>
      <label className="flex flex-col gap-1.5 text-xs text-white/50">
        Message
        <textarea
          className={fieldClass}
          name="message"
          rows={5}
          placeholder="Votre message"
        />
      </label>
      <button
        type="submit"
        data-cursor-hover
        className="mt-2 min-h-11 self-start rounded-full bg-[var(--color-accent)] px-6 py-3 text-sm font-semibold text-black transition hover:brightness-110"
      >
        Envoyer (démo)
      </button>
    </form>
  );
}
