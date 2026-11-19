"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

/**
 * The only script a panel needs: turn the open <dialog> it sits in into a modal one, and send
 * Escape and a click on the dimmed page to the close link's address.
 *
 * The server draws the dialog with `open`, which works with no script. showModal() refuses a
 * dialog that is already open, so the attribute is taken off first.
 */
export default function PanelOpen({ closeHref }: { closeHref: string }) {
  const router = useRouter();
  const mark = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const me = mark.current?.closest("dialog");
    if (!me) return;
    const before = document.activeElement as HTMLElement | null;
    me.removeAttribute("open");
    me.showModal();
    // The browser focuses the first focusable thing, which is the title's X on a form-less panel and
    // sometimes nothing useful; put the cursor in the first field, falling back to the X.
    const field = me.querySelector<HTMLElement>("input:not([type=hidden]):not([disabled]), textarea:not([disabled]), select:not([disabled])");
    (field ?? me.querySelector<HTMLElement>("a[aria-label=Close]"))?.focus();
    // Escape: replace the panel's entry, so Back is the page before and never reopens the panel.
    const onCancel = (e: Event) => {
      e.preventDefault();
      router.replace(closeHref, { scroll: false });
    };
    // A click on ::backdrop lands on the dialog itself, not on anything inside it.
    const onClick = (e: MouseEvent) => {
      if (e.target === me) router.replace(closeHref, { scroll: false });
    };
    me.addEventListener("cancel", onCancel);
    me.addEventListener("click", onClick);
    return () => {
      me.removeEventListener("cancel", onCancel);
      me.removeEventListener("click", onClick);
      if (me.open) me.close();
      if (before?.isConnected) before.focus();
    };
  }, [closeHref, router]);
  return <span ref={mark} hidden />;
}
