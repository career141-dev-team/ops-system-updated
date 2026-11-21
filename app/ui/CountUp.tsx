"use client";

import gsap from "gsap";
import { useLayoutEffect, useRef } from "react";

import { DUR, EASE_OUT, NUMBER_LOCALE, prefersReducedMotion } from "@/lib/motion";

/** The final number is the server-rendered text; on mount it counts up from 0 and lands on it. */
export default function CountUp({ value }: { value: number }) {
  const el = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const node = el.current;
    if (!node || prefersReducedMotion() || !Number.isFinite(value) || Math.abs(value) < 10) return; // tiny numbers just appear
    node.textContent = "0"; // before paint, so the final value never flashes
    const proxy = { n: 0 };
    const tween = gsap.to(proxy, {
      n: value,
      duration: DUR.panel * 1.6,
      ease: EASE_OUT,
      onUpdate: () => {
        node.textContent = Math.round(proxy.n).toLocaleString(NUMBER_LOCALE);
      },
      onComplete: () => {
        node.textContent = value.toLocaleString(NUMBER_LOCALE);
      },
    });
    return () => {
      tween.kill();
      node.textContent = value.toLocaleString(NUMBER_LOCALE);
    };
  }, [value]);

  return <span ref={el}>{value.toLocaleString(NUMBER_LOCALE)}</span>;
}
