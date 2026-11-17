"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";

const PREFIX = "keepfields:";
// shortcut: kept for two minutes and used once, because a refused save comes straight
// back; a database-backed draft would be the upgrade if people leave forms half done.
const FRESH_MS = 120_000;

/**
 * Put one of these inside a form and it keeps what was typed when the save is
 * refused (17 Nov).
 *
 * A server action that refuses (a time in the past, no TA lead picked) redirects
 * back with a message, and the page is built again with empty fields, so
 * everything typed was lost. This remembers the fields on submit and puts them
 * back when the same form is shown again with a message. It lives in the
 * browser tab only; nothing is sent anywhere.
 */
export function KeepFields({ id }: { id: string }) {
  const marker = useRef<HTMLSpanElement>(null);
  // A refused save comes back as a soft navigation: this component is not rebuilt, so the address is what says "again".
  const search = useSearchParams().toString();

  useEffect(() => {
    const form = marker.current?.closest("form");
    if (!form) return;

    const remember = () => {
      try {
        const pairs = [...new FormData(form)].filter(
          (pair): pair is [string, string] => typeof pair[1] === "string" && !pair[0].startsWith("$"),
        );
        sessionStorage.setItem(PREFIX + id, JSON.stringify({ at: Date.now(), pairs }));
      } catch {
        // No storage (a private window): the save itself is not affected.
      }
    };
    form.addEventListener("submit", remember);

    // React resets a form after its action finishes, which would wipe the values again,
    // so they go back a moment after that.
    const later = setTimeout(() => {
      try {
        const raw = search.includes("msg=") ? sessionStorage.getItem(PREFIX + id) : null;
        if (raw) {
          sessionStorage.removeItem(PREFIX + id);
          const saved = JSON.parse(raw) as { at: number; pairs: [string, string][] };
          if (Date.now() - saved.at <= FRESH_MS) {
            // Several fields can share a name (the client attendees), so each name hands out its values in order.
            const queues = new Map<string, string[]>();
            for (const [name, value] of saved.pairs) queues.set(name, [...(queues.get(name) ?? []), value]);
            for (const el of Array.from(form.elements)) {
              const isField = el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement;
              if (!isField || !el.name) continue;
              if (el instanceof HTMLInputElement && ["hidden", "checkbox", "radio", "file", "submit"].includes(el.type)) continue;
              const next = queues.get(el.name)?.shift();
              if (next !== undefined) el.value = next;
            }
          }
        }
      } catch {
        // Nothing to restore: the form just starts as it always did.
      }
    }, 60);
    return () => {
      clearTimeout(later);
      form.removeEventListener("submit", remember);
    };
  }, [id, search]);

  return <span ref={marker} hidden />;
}
