"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Link from "next/link";
import { Preloader } from "./Preloader";

const HeroCanvas = dynamic(
  () => import("@/components/three/HeroCanvas").then((mod) => mod.HeroCanvas),
  { ssr: false }
);

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

type Chapter = {
  kicker: string;
  title: string;
  body: string;
  cta?: { href: string; label: string };
};

const chapters: Chapter[] = [
  {
    kicker: "Driv'in La e-Concession",
    title: "L'exception automobile, sélectionnée pour vous",
    body: "Voitures d'occasion premium, luxe et sport à Bordeaux et en Gironde.",
    cta: { href: "/annonces", label: "Voir les annonces" },
  },
  {
    kicker: "Recherche personnalisée",
    title: "Le véhicule atypique que vous cherchez existe",
    body: "Notre équipe active un réseau national et des partenaires européens pour dénicher la voiture qui vous correspond.",
  },
  {
    kicker: "Confiance & traçabilité",
    title: "Chaque véhicule, une origine vérifiée",
    body: "Traçabilité, service administratif, financement et démarches de carte grise : nous accompagnons chaque étape.",
  },
  {
    kicker: "Prêt à passer au volant ?",
    title: "Venez essayer votre prochaine exception",
    body: "5 Rue des Métiers, Z.A. du Cournalet, 33290 Blanquefort — sur rendez-vous le samedi.",
    cta: { href: "/contact", label: "Prendre contact" },
  },
];

export function Storytelling() {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef(0);
  const [activeChapter, setActiveChapter] = useState(0);

  useEffect(() => {
    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (prefersReduced || !wrapperRef.current) return;

    const ctx = gsap.context(() => {
      const trigger = ScrollTrigger.create({
        trigger: wrapperRef.current,
        start: "top top",
        end: "+=300%",
        pin: true,
        scrub: 0.6,
        onUpdate: (self) => {
          progressRef.current = self.progress;
          const chapterIndex = Math.min(
            chapters.length - 1,
            Math.floor(self.progress * chapters.length)
          );
          setActiveChapter((prev) =>
            prev === chapterIndex ? prev : chapterIndex
          );
        },
      });

      return () => trigger.kill();
    }, wrapperRef);

    // Le chargement asynchrone des polices (next/font) peut légèrement
    // changer la mise en page après la mesure initiale de ScrollTrigger ;
    // on recalcule une fois les polices prêtes pour éviter un décalage
    // entre le pin et le contenu suivant.
    document.fonts?.ready.then(() => ScrollTrigger.refresh());

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={wrapperRef}
      className="relative"
      aria-label="Présentation Driv'in Bordeaux"
    >
      {/*
        Pas de hauteur explicite ici : GSAP ScrollTrigger (pin: true) insère
        son propre "pin-spacer" dimensionné sur `end`. Fixer une hauteur en
        plus créait un doublon d'espace de scroll (zone vide avant la section
        suivante). En mode reduced-motion (pas de pin), la section garde
        naturellement la hauteur de son enfant sticky (100vh), ce qui reste
        un repli cohérent.
      */}
      <div className="sticky top-0 h-screen w-full overflow-hidden bg-[#07070a]">
        {/* Poster de secours : visible immédiatement, sous la scène 3D différée */}
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse at 60% 45%, rgba(248,147,3,0.16), transparent 55%), linear-gradient(180deg, #0b0b10 0%, #07070a 60%, #050506 100%)",
          }}
        />
        <HeroCanvas progressRef={progressRef} />

        <Preloader />

        <div className="relative z-10 mx-auto flex h-full max-w-6xl flex-col justify-end px-6 pb-24 sm:justify-center sm:pb-0">
          {chapters.map((chapter, index) => (
            <div
              key={chapter.title}
              aria-hidden={activeChapter !== index}
              className="max-w-xl transition-all duration-700 ease-out"
              style={{
                position: index === 0 ? "static" : "absolute",
                opacity: activeChapter === index ? 1 : 0,
                transform:
                  activeChapter === index
                    ? "translateY(0)"
                    : "translateY(24px)",
                pointerEvents: activeChapter === index ? "auto" : "none",
              }}
            >
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[var(--color-accent)]">
                {chapter.kicker}
              </p>
              {index === 0 ? (
                <h1 className="text-balance mt-4 font-display text-4xl font-bold leading-[1.05] text-white sm:text-6xl">
                  {chapter.title}
                </h1>
              ) : (
                <p className="text-balance mt-4 font-display text-4xl font-bold leading-[1.05] text-white sm:text-6xl">
                  {chapter.title}
                </p>
              )}
              <p className="mt-5 max-w-md text-base text-white/70 sm:text-lg">
                {chapter.body}
              </p>
              {chapter.cta ? (
                <Link
                  href={chapter.cta.href}
                  className="mt-8 inline-flex min-h-11 items-center rounded-full bg-[var(--color-accent)] px-6 py-3 text-sm font-semibold text-black transition hover:brightness-110"
                >
                  {chapter.cta.label}
                </Link>
              ) : null}
            </div>
          ))}
        </div>

        <div
          aria-hidden="true"
          className="absolute bottom-8 left-1/2 z-10 hidden -translate-x-1/2 flex-col items-center gap-2 text-white/40 sm:flex"
          style={{ opacity: activeChapter === 0 ? 1 : 0, transition: "opacity 0.4s" }}
        >
          <span className="text-[10px] uppercase tracking-[0.3em]">Scroll</span>
          <span className="h-8 w-px animate-pulse bg-white/40" />
        </div>
      </div>
    </section>
  );
}
