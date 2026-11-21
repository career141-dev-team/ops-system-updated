"use client";

import gsap from "gsap";
import { useEffect, useRef } from "react";

import { DUR, EASE_SMOOTH, prefersReducedMotion } from "@/lib/motion";

type Box = { x: number; y: number; w: number; h: number };

/**
 * The active pill slides from the old tab to the new one (owner, 21 Nov). PillTabs is a server
 * component whose nav survives soft navigation, so this keeps the last active pill's box in a ref
 * and tweens one ink span from there. With no script or reduced motion it does nothing: the
 * server-rendered classes already show the right pill.
 */
export default function TabSlide({ active }: { active: string }) {
  const ink = useRef<HTMLSpanElement>(null);
  const last = useRef<Box | null>(null);

  useEffect(() => {
    const nav = ink.current?.parentElement;
    const pill = nav?.querySelector<HTMLElement>("a[aria-current]");
    if (!nav || !pill) return;
    const n = nav.getBoundingClientRect();
    const p = pill.getBoundingClientRect();
    const to = { x: p.left - n.left + nav.scrollLeft, y: p.top - n.top, w: p.width, h: p.height };
    const from = last.current;
    last.current = to;
    if (!from || prefersReducedMotion() || !ink.current) return;

    nav.setAttribute("data-sliding", "");
    const tween = gsap.fromTo(
      ink.current,
      { x: from.x, y: from.y, width: from.w, height: from.h, opacity: 1 },
      {
        x: to.x, y: to.y, width: to.w, height: to.h,
        duration: DUR.base, ease: EASE_SMOOTH,
        onComplete: () => {
          nav.removeAttribute("data-sliding");
          gsap.set(ink.current, { opacity: 0 });
        },
      },
    );
    return () => {
      tween.kill();
      nav.removeAttribute("data-sliding");
    };
  }, [active]);

  return <span ref={ink} aria-hidden="true" className="pointer-events-none absolute left-0 top-0 rounded-full bg-ink opacity-0" />;
}
