"use client";

import gsap from "gsap";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

import { DUR, EASE_IN, EASE_OUT, prefersReducedMotion } from "@/lib/motion";

/**
 * Turns the open <dialog> it sits in into a modal dialog, animates entrance/exit with GSAP
 * (slide-in + section stagger for 680px `.panel` drawers; scale-fade for 1600px `.send-modal`
 * overlays), and routes Escape / backdrop clicks to `closeHref`.
 */
export default function PanelOpen({ closeHref }: { closeHref: string }) {
  const router = useRouter();
  const mark = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const me = mark.current?.closest("dialog");
    if (!me) return;
    const before = document.activeElement as HTMLElement | null;
    const isSendModal = me.classList.contains("send-modal");
    const reduced = prefersReducedMotion();
    let closing = false;

    me.removeAttribute("open");
    me.showModal();

    const ctx = gsap.context(() => {
      if (reduced) return;
      if (isSendModal) {
        gsap.fromTo(
          me,
          { y: 14, scale: 0.97, opacity: 0 },
          { y: 0, scale: 1, opacity: 1, duration: 0.3, ease: EASE_OUT, clearProps: "transform,opacity" },
        );
      } else {
        gsap.fromTo(
          me,
          { x: 40, opacity: 0 },
          { x: 0, opacity: 1, duration: DUR.panel, ease: EASE_OUT, clearProps: "transform,opacity" },
        );
        const sections = Array.from(me.querySelectorAll<HTMLElement>("section")).slice(0, 6);
        if (sections.length > 0) {
          gsap.fromTo(
            sections,
            { y: 8, opacity: 0 },
            {
              y: 0,
              opacity: 1,
              duration: 0.24,
              stagger: 0.04,
              delay: 0.06,
              ease: EASE_OUT,
              clearProps: "transform,opacity",
            },
          );
        }
      }
    }, me);

    // Focus the first usable field, falling back to Close.
    const field = me.querySelector<HTMLElement>("input:not([type=hidden]):not([disabled]), textarea:not([disabled]), select:not([disabled])");
    (field ?? me.querySelector<HTMLElement>("a[aria-label=Close]"))?.focus();

    const closeSmooth = () => {
      if (closing) return;
      closing = true;
      if (reduced) {
        router.replace(closeHref, { scroll: false });
        return;
      }
      gsap.to(me, {
        ...(isSendModal ? { y: 10, scale: 0.97, opacity: 0 } : { x: 28, opacity: 0 }),
        duration: DUR.fast,
        ease: EASE_IN,
        onComplete: () => router.replace(closeHref, { scroll: false }),
      });
    };

    const onCancel = (e: Event) => {
      e.preventDefault();
      closeSmooth();
    };
    const onClick = (e: MouseEvent) => {
      if (e.target === me) closeSmooth();
    };

    me.addEventListener("cancel", onCancel);
    me.addEventListener("click", onClick);
    return () => {
      ctx.revert();
      me.removeEventListener("cancel", onCancel);
      me.removeEventListener("click", onClick);
      if (me.open) me.close();
      if (before?.isConnected) before.focus();
    };
  }, [closeHref, router]);

  return <span ref={mark} hidden />;
}
