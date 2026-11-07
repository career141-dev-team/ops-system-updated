"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

/**
 * The three-second confirmation (7 Nov, UX order 2).
 *
 * Until today the app said nothing when you clicked. Approve a draft and the
 * page reloaded; whether it went was on the message's own page, which you
 * had just left. So: a small line in the corner - *Approved and sent*, or
 * the gate's reason - gone in three seconds, out of the way of the next one.
 *
 * It reads `?did=` and nothing else. `?msg=` stays the banner that waits to
 * be read: a refusal, an explanation, a thing a person must act on. `did` is
 * for what has already happened and needs no reply.
 *
 * It is a client component because it has to count to three and then clear
 * the parameter from the address bar, so a refresh does not say "Sent."
 * again about something that went a minute ago. No Undo on approving - it
 * sends, and a sent email cannot be unsent. Undo arrives with the actions
 * where it is honest.
 */
export default function Toast() {
  const params = useSearchParams();
  const did = params.get("did");
  // The moment it happened. Two identical sentences in a row are two
  // confirmations, and this is what tells them apart (the walk, 7 Nov).
  const at = params.get("at");
  const [shown, setShown] = useState<string | null>(null);

  // `did` arrives: show it, and take it out of the address bar at once so a
  // refresh does not say "Sent." again about something that went a minute
  // ago. This is history.replaceState and not the router on purpose: the
  // first version used router.replace, which is a navigation, and the walk
  // showed a stray GET between two approvals that ended on /sign-in. A
  // confirmation must never move the page it confirms (7 Nov).
  useEffect(() => {
    if (!did) return;
    setShown(did);
    const url = new URL(window.location.href);
    url.searchParams.delete("did");
    url.searchParams.delete("at");
    window.history.replaceState(window.history.state, "", url.pathname + url.search);
  }, [did, at]);

  // The three seconds are counted from `shown`, not from `did`. Counting
  // from `did` meant the effect re-ran when the param was stripped and its
  // cleanup cancelled the timer, so the line never went away - the second
  // thing the walk found.
  useEffect(() => {
    if (!shown) return;
    const timer = window.setTimeout(() => setShown(null), 3200);
    return () => window.clearTimeout(timer);
  }, [shown]);

  if (!shown) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed bottom-5 left-1/2 z-50 max-w-[min(92vw,520px)] -translate-x-1/2 rounded-lg bg-ink px-4 py-2.5 text-[13px] text-surface shadow-[0_6px_24px_rgba(22,24,26,0.18)] motion-safe:animate-[toast_220ms_ease-out]"
    >
      {shown}
    </div>
  );
}
