"use client";

import { useEffect } from "react";

import { keyActFor, rowAfter } from "@/lib/keys";

/**
 * The keyboard (8 Nov, UX order 8).
 *
 * One listener on the page. The rows that can be walked carry `data-row`
 * and can take focus; the thing that opens a row carries `data-open`, the
 * button that approves it `data-approve`. J and K move the focus from row
 * to row - real focus, so the ring the browser already draws is the
 * marker and a screen reader follows along. A presses the row's own
 * Approve button, which is the same form the mouse would send, through the
 * same gate; Enter opens it; / goes to the find box.
 *
 * Nothing here knows what a row is. A page that wants the keys marks its
 * rows; a page that does not is left alone.
 */
export default function Keys() {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      // Esc closes a file shown over To approve (`data-close` is its X, a plain link back).
      if (event.key === "Escape") {
        document.querySelector<HTMLElement>("[data-close]")?.click();
        return;
      }
      const act = keyActFor({
        key: event.key,
        ctrlKey: event.ctrlKey,
        metaKey: event.metaKey,
        altKey: event.altKey,
        target: event.target instanceof HTMLElement ? { tagName: event.target.tagName, isContentEditable: event.target.isContentEditable } : null,
      });
      if (!act) return;

      if (act === "search") {
        const box = document.querySelector<HTMLInputElement>('input[name="q"]');
        if (!box) return;
        event.preventDefault();
        box.focus();
        box.select();
        return;
      }

      const rows = Array.from(document.querySelectorAll<HTMLElement>("[data-row]"));
      // `data-solo` is the one draft the To approve view shows: its keys work without a row being focused.
      const active =
        (document.activeElement instanceof HTMLElement ? document.activeElement.closest<HTMLElement>("[data-row]") : null) ??
        document.querySelector<HTMLElement>("[data-solo]");
      const current = active ? rows.indexOf(active) : -1;

      if (act === "next" || act === "prev") {
        const to = rowAfter(current, rows.length, act);
        if (to === null) return;
        event.preventDefault();
        rows[to].focus();
        rows[to].scrollIntoView({ block: "nearest" });
        return;
      }

      if (!active) return;
      const target = active.querySelector<HTMLElement>({ approve: "[data-approve]", edit: "[data-edit]", skip: "[data-skip]", open: "[data-open]" }[act]);
      if (!target) return;
      event.preventDefault();
      target.click();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  return null;
}
