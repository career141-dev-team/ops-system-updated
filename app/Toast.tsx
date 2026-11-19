"use client";

import gsap from "gsap";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { EASE_IN, EASE_OUT, prefersReducedMotion } from "@/lib/motion";

/**
 * The three-second confirmation (7 Nov, UX order 2), now animated with GSAP for a crisp
 * slide-up entrance and smooth slide-down exit before unmounting.
 */
export default function Toast() {
  const params = useSearchParams();
  const did = params.get("did");
  const at = params.get("at");
  const [shown, setShown] = useState<string | null>(null);
  const elRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!did) return;
    setShown(did);
    const url = new URL(window.location.href);
    url.searchParams.delete("did");
    url.searchParams.delete("at");
    window.history.replaceState(window.history.state, "", url.pathname + url.search);
  }, [did, at]);

  useEffect(() => {
    if (!shown) return;
    const el = elRef.current;
    const reduced = prefersReducedMotion();

    if (el && !reduced) {
      gsap.fromTo(
        el,
        { y: 16, scale: 0.96, opacity: 0 },
        { y: 0, scale: 1, opacity: 1, duration: 0.24, ease: EASE_OUT, clearProps: "transform" },
      );
    }

    const exitTimer = window.setTimeout(() => {
      if (el && !reduced) {
        gsap.to(el, {
          y: 10,
          opacity: 0,
          duration: 0.2,
          ease: EASE_IN,
          onComplete: () => setShown(null),
        });
      } else {
        setShown(null);
      }
    }, 3000);

    return () => window.clearTimeout(exitTimer);
  }, [shown]);

  if (!shown) return null;

  return (
    <div
      ref={elRef}
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed bottom-5 left-1/2 z-50 max-w-[min(92vw,520px)] -translate-x-1/2 rounded-lg bg-ink px-4 py-2.5 text-[13px] text-surface shadow-[0_6px_24px_rgba(22,24,26,0.18)]"
    >
      {shown}
    </div>
  );
}
