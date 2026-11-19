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
    me.removeAttribute("open");
    me.showModal();
    // Escape: stay in the page's own history, so Back is still the page before.
    const onCancel = (e: Event) => {
      e.preventDefault();
      router.push(closeHref, { scroll: false });
    };
    // A click on ::backdrop lands on the dialog itself, not on anything inside it.
    const onClick = (e: MouseEvent) => {
      if (e.target === me) router.push(closeHref, { scroll: false });
    };
    me.addEventListener("cancel", onCancel);
    me.addEventListener("click", onClick);
    return () => {
      me.removeEventListener("cancel", onCancel);
      me.removeEventListener("click", onClick);
      if (me.open) me.close();
    };
  }, [closeHref, router]);
  return <span ref={mark} hidden />;
}
