"use client";

import gsap from "gsap";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, type ReactNode } from "react";

import { DUR, EASE_OUT, prefersReducedMotion } from "@/lib/motion";

/**
 * Wraps the main page content in layout.tsx to give route and tab (`?view=`) changes a crisp,
 * hardware-accelerated entrance with a gentle stagger on top-level cards/sections (capped at 8
 * so long tables/lists stay instant).
 */
export default function MotionStage({ children }: { children: ReactNode }) {
  const path = usePathname() ?? "/";
  const params = useSearchParams();
  const view = params.get("view") ?? "";
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el || prefersReducedMotion()) return;

    const ctx = gsap.context(() => {
      // Collect top-level visible cards/sections (skip dialogs/modals which animate themselves)
      const candidates = Array.from(el.querySelectorAll<HTMLElement>("section, article")).filter(
        (node) => !node.closest("dialog") && node.offsetParent !== null,
      );
      const targets = candidates.slice(0, 8);

      if (targets.length > 0) {
        gsap.fromTo(
          targets,
          { y: 10, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: DUR.base,
            stagger: DUR.stagger,
            ease: EASE_OUT,
            clearProps: "transform,opacity",
            overwrite: "auto",
          },
        );
      } else {
        gsap.fromTo(
          el,
          { y: 8, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: DUR.base,
            ease: EASE_OUT,
            clearProps: "transform,opacity",
            overwrite: "auto",
          },
        );
      }
    }, el);

    return () => ctx.revert();
  }, [path, view]);

  return <div ref={root}>{children}</div>;
}
