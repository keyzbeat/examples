"use client";

import { useEffect, useRef, useState } from "react";
import { Scene } from "./Scene";

function supportsWebGL(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return !!(canvas.getContext("webgl2") || canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

function canRender3DNow(): boolean {
  const prefersReduced = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;
  const connection = (
    navigator as Navigator & {
      connection?: { saveData?: boolean; effectiveType?: string };
    }
  ).connection;
  const saveData = Boolean(connection?.saveData);
  const slowNetwork = connection?.effectiveType === "2g";

  return !prefersReduced && !saveData && !slowNetwork && supportsWebGL();
}

/**
 * Point d'entrée client-only de la scène 3D. Chargé via next/dynamic
 * (ssr:false) depuis Storytelling.tsx pour ne jamais bloquer le LCP du texte
 * de hero. Repli silencieux (aucun canvas monté) sur WebGL indisponible,
 * saveData ou réduction de mouvement demandée. Ce composant n'étant jamais
 * rendu côté serveur, l'accès direct à `window` dans l'état initial est sûr.
 */
export function HeroCanvas({
  progressRef,
}: {
  progressRef: React.MutableRefObject<number>;
}) {
  const [canRender3D] = useState(canRender3DNow);
  const [active, setActive] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || !canRender3D) return;
    const observer = new IntersectionObserver(
      ([entry]) => setActive(entry.isIntersecting),
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [canRender3D]);

  if (!canRender3D) return null;

  return (
    <div ref={containerRef} className="absolute inset-0" aria-hidden="true">
      <Scene progressRef={progressRef} active={active} />
    </div>
  );
}
