"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import Icon from "@/app/Icon";
import { bellInWords, type Bell as BellCount } from "@/lib/bell";

/** How often the sidebar asks. Half a minute is a client's reply arriving, not a stock ticker. */
const EVERY_MS = 30_000;

/**
 * The bell (7 Nov, UX order 3).
 *
 * One number that follows you around the app and stays true without a
 * reload. It arrives with the page, then asks `/api/bell` every half minute;
 * when the number goes up it pulses once, so a reply landing while you are
 * three pages away is seen rather than found later.
 *
 * It is a link to Your day and nothing more. No dropdown, no list behind it:
 * the app has no overlays, and the list it would show is the page it goes
 * to. The number going red means something of yours is late.
 */
export default function Bell({ initial, round = false }: { initial: BellCount; round?: boolean }) {
  const [bell, setBell] = useState<BellCount>(initial);
  const [rose, setRose] = useState(false);

  useEffect(() => {
    let last = initial.waiting;
    let stopped = false;

    const ask = async () => {
      try {
        const res = await fetch("/api/bell", { cache: "no-store" });
        if (!res.ok || stopped) return;
        const next = (await res.json()) as BellCount & { ok: boolean };
        if (!next.ok || stopped) return;
        setBell(next);
        if (next.waiting > last) {
          setRose(true);
          window.setTimeout(() => setRose(false), 1200);
        }
        last = next.waiting;
      } catch {
        // The network being away is not news; the number simply stays as it was.
      }
    };

    const timer = window.setInterval(ask, EVERY_MS);
    // And straight away when the tab comes back, because half a minute of
    // being hidden is the usual way to miss something.
    const onShow = () => {
      if (document.visibilityState === "visible") void ask();
    };
    document.addEventListener("visibilitychange", onShow);
    return () => {
      stopped = true;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onShow);
    };
  }, [initial.waiting]);

  const words = bellInWords(bell);
  const tone = bell.late ? "bg-bg-danger text-danger" : bell.waiting ? "bg-bg-brand text-brand" : "bg-shell-sunk text-ink-faint";

  // The top bar's bell (13 Nov, Figma): a round button with a dot, the
  // number in its label. Red when something is late, green when only waiting.
  if (round) {
    return (
      <Link
        href="/"
        title={words}
        aria-label={words}
        className="relative flex size-11 shrink-0 items-center justify-center rounded-full bg-sunk text-ink transition-colors hover:bg-shell"
      >
        <Icon name="bell" size={20} className={rose ? "motion-safe:animate-[ring_600ms_ease-out]" : ""} />
        {bell.waiting > 0 && (
          <span
            aria-hidden="true"
            className={"absolute right-[9px] top-[10px] size-2 rounded-full " + (bell.late ? "bg-danger" : "bg-brand")}
          />
        )}
      </Link>
    );
  }

  return (
    <Link
      href="/"
      title={words}
      aria-label={words}
      className="flex items-center gap-1.5 rounded-lg px-1.5 py-1 text-ink-soft transition-colors hover:bg-shell-sunk hover:text-ink"
    >
      <Icon name="bell" size={16} className={rose ? "motion-safe:animate-[ring_600ms_ease-out]" : ""} />
      {bell.waiting > 0 && (
        <span
          className={
            "min-w-[20px] rounded-full px-1.5 text-center text-[11.5px] font-medium tabular-nums " +
            tone +
            (rose ? " motion-safe:animate-[toast_220ms_ease-out]" : "")
          }
        >
          {bell.waiting}
        </span>
      )}
    </Link>
  );
}
