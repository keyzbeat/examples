"use client";

import {
  useEffect,
  useRef,
  useState,
  type ComponentPropsWithRef,
  type ComponentType,
  type ElementType,
  type ReactNode,
} from "react";
import { usePrefersReducedMotion } from "@/lib/usePrefersReducedMotion";

type RevealProps<T extends ElementType> = {
  children: ReactNode;
  className?: string;
  delay?: number;
  /** Balise du conteneur (ex. "li" pour rester valide dans un <ol>/<ul>). */
  as?: T;
};

export function RevealOnScroll<T extends ElementType = "div">({
  children,
  className,
  delay = 0,
  as,
}: RevealProps<T>) {
  // Les seules balises passées ici (div, li) partagent les mêmes props DOM
  // de base ; ce cast évite l'écueil connu de TypeScript où un `ElementType`
  // générique fait dégénérer les props JSX en `never`.
  const Tag = (as ?? "div") as ComponentType<ComponentPropsWithRef<"div">>;
  const prefersReduced = usePrefersReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    if (prefersReduced) return;
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.2 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [prefersReduced]);

  const visible = prefersReduced || inView;

  return (
    <Tag
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(28px)",
        transition: `opacity 0.7s ease ${delay}s, transform 0.7s ease ${delay}s`,
      }}
    >
      {children}
    </Tag>
  );
}
