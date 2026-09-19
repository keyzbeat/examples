/**
 * Interrupteur unique démo / production.
 * NEXT_PUBLIC_DEMO_MODE="false" retire le noindex, le mot de passe et le bandeau.
 * Toute autre valeur (ou absence de variable) garde le site en mode démo privée.
 */
export const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE !== "false";

export const DEMO_BANNER_TEXT =
  "Maquette de proposition, non contractuelle, non affiliée au site officiel.";
