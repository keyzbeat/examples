"use client";

import { useRef, type ReactNode, type ComponentProps } from "react";
import Link from "next/link";

export function MagneticLink({
  href,
  children,
  className,
  ...rest
}: { href: string; children: ReactNode } & ComponentProps<typeof Link>) {
  const ref = useRef<HTMLAnchorElement>(null);

  function handleMove(e: React.MouseEvent<HTMLAnchorElement>) {
    const el = ref.current;
    if (!el || !window.matchMedia("(hover: hover) and (pointer: fine)").matches)
      return;
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    el.style.transform = `translate(${x * 0.25}px, ${y * 0.4}px)`;
  }

  function handleLeave() {
    if (ref.current) ref.current.style.transform = "translate(0, 0)";
  }

  return (
    <Link
      ref={ref}
      href={href}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      data-cursor-hover
      className={className}
      style={{ transition: "transform 0.2s ease" }}
      {...rest}
    >
      {children}
    </Link>
  );
}
