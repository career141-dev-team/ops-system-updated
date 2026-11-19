"use client";

import gsap from "gsap";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

import { EASE_OUT, prefersReducedMotion } from "@/lib/motion";

/**
 * A small card that hangs under a button in the top bar (v6 frames G3 "Add" and G4 "Notifications").
 *
 * GSAP animates scale-fade from the button's corner plus a gentle stagger on direct menu items.
 */
export default function Popover({
  label,
  triggerClass,
  trigger,
  width = 300,
  above = false,
  children,
}: {
  label: string;
  triggerClass: string;
  trigger: ReactNode;
  width?: number;
  above?: boolean;
  children: ReactNode;
}) {
  const path = usePathname() ?? "/";
  const button = useRef<HTMLButtonElement>(null);
  const card = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [at, setAt] = useState<{ top?: number; bottom?: number; right: number }>({ top: 104, right: 40 });
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  useEffect(() => setOpen(false), [path]);

  useEffect(() => {
    const el = card.current;
    if (!open || !el || prefersReducedMotion()) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        el,
        { scale: 0.94, y: above ? 6 : -6, opacity: 0, transformOrigin: above ? "bottom right" : "top right" },
        { scale: 1, y: 0, opacity: 1, duration: 0.22, ease: EASE_OUT, clearProps: "transform,opacity" },
      );
      const links = Array.from(el.querySelectorAll<HTMLElement>("a")).slice(0, 10);
      if (links.length > 0) {
        gsap.fromTo(
          links,
          { y: 4, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.18, stagger: 0.018, delay: 0.04, ease: EASE_OUT, clearProps: "transform,opacity" },
        );
      }
    }, el);
    return () => ctx.revert();
  }, [open, above]);

  return (
    <>
      <button
        ref={button}
        type="button"
        aria-label={label}
        title={label}
        aria-expanded={open}
        aria-haspopup="true"
        className={triggerClass}
        onClick={() => {
          const box = button.current?.getBoundingClientRect();
          if (box) {
            const right = Math.max(16, window.innerWidth - box.right);
            setAt(above ? { bottom: window.innerHeight - box.top + 12, right } : { top: box.bottom + 12, right });
          }
          setOpen((o) => !o);
        }}
      >
        {trigger}
      </button>
      {open &&
        mounted &&
        createPortal(
          <>
            <button type="button" data-close onClick={() => setOpen(false)} aria-label="Close" className="fixed inset-0 z-[60] cursor-default" />
            <div
              ref={card}
              role="dialog"
              aria-label={label}
              style={{ top: at.top, bottom: at.bottom, right: at.right, width }}
              onClick={() => setOpen(false)}
              className="fixed z-[70] max-h-[calc(100dvh-120px)] max-w-[calc(100vw-32px)] overflow-y-auto rounded-[24px] bg-surface shadow-float"
            >
              {children}
            </div>
          </>,
          document.body,
        )}
    </>
  );
}
