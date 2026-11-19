"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

/**
 * A small card that hangs under a button in the top bar (v6 frames G3 "Add" and G4 "Notifications").
 *
 * One wrapper for both, so they open, close and sit the same way: the card is drawn into <body>
 * (the bar has a transform, which would make a `fixed` child cover the bar and nothing else), its
 * right edge under the button's right edge, over a clear click-away layer. Esc is handled by Keys
 * (`data-close`), going to another page closes it, and the button says whether it is open.
 */
export default function Popover({
  label,
  triggerClass,
  trigger,
  width = 300,
  above = false,
  children,
}: {
  /** What the button is called for a screen reader. */
  label: string;
  triggerClass: string;
  trigger: ReactNode;
  width?: number;
  /** Open upwards, for a button on the phone's bottom bar. */
  above?: boolean;
  children: ReactNode;
}) {
  const path = usePathname() ?? "/";
  const button = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [at, setAt] = useState<{ top?: number; bottom?: number; right: number }>({ top: 104, right: 40 });
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  useEffect(() => setOpen(false), [path]);

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
              role="dialog"
              aria-label={label}
              style={{ top: at.top, bottom: at.bottom, right: at.right, width }}
              onClick={() => setOpen(false)} // a panel opens by a query change only, so the path never changes
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
