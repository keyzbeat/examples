import { isDemoMode, DEMO_BANNER_TEXT } from "@/lib/demo";

/**
 * Source unique du texte de non-contractualité de la démo.
 * Ne jamais dupliquer ce texte ailleurs : importer ce composant.
 */
export function DemoBadge() {
  if (!isDemoMode) return null;
  return (
    <div
      role="note"
      aria-label="Avertissement maquette"
      className="fixed bottom-3 left-1/2 z-[80] -translate-x-1/2 rounded-full border border-white/15 bg-black/80 px-4 py-2 text-center text-[11px] font-medium tracking-wide text-white/80 backdrop-blur-sm sm:bottom-4 sm:text-xs"
    >
      {DEMO_BANNER_TEXT}
    </div>
  );
}

export function DemoFooterNote() {
  if (!isDemoMode) return null;
  return (
    <p className="border-t border-white/10 px-6 py-4 text-center text-xs text-white/50">
      {DEMO_BANNER_TEXT}
    </p>
  );
}
