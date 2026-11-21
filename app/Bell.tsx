"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import Icon from "@/app/Icon";
import Popover from "@/app/ui/Popover";
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
 * 19 Nov (v6 frame G4): on the desk it opens a card under the bell saying what is waiting, in
 * the three things the number is made of, with a link to the full page. The feed of "what
 * changed on my clients" has no source yet, so the card says only what the number knows; there
 * is no "Mark all read" until something can be read. On a phone it is a link to /notifications.
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

  // The top bar's bell (v6 128:32): a 44px round button, a dot when something waits. Red when
  // something is late, green when only waiting.
  if (round) {
    const later = bell.late;
    const drafts = Math.max(0, bell.waiting - bell.late - bell.inbox);
    const line = "flex gap-3 rounded-[12px] py-1 hover:bg-sunk";
    const lines: { dot: string; text: string; href: string }[] = [];
    if (later > 0) lines.push({ dot: "bg-danger", text: later === 1 ? "1 thing of yours is late" : later + " things of yours are late", href: "/" });
    if (drafts > 0) lines.push({ dot: "bg-warn", text: drafts === 1 ? "1 thing needs you today" : drafts + " things need you today", href: "/" });
    if (bell.inbox > 0) lines.push({ dot: "bg-info", text: bell.inbox === 1 ? "1 email nobody has filed" : bell.inbox + " emails nobody has filed", href: "/mail" });
    return (
      <Popover
        label={words}
        width={480}
        triggerClass="relative flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full bg-sunk text-ink transition-colors hover:bg-shell"
        trigger={
          <>
            <Icon name="bell" size={18} className={rose ? "motion-safe:animate-[ring_600ms_ease-out]" : ""} />
            {bell.waiting > 0 && (
              <span aria-hidden="true" className={"absolute right-[10px] top-[10px] size-2 rounded-full " + (rose ? "badge-pulse " : "") + (bell.late ? "bg-danger" : "bg-brand")} />
            )}
          </>
        }
      >
        <div className="flex flex-col gap-[18px] p-7">
          <div>
            <p className="t-h2">Notifications</p>
            <p className="t-small text-ink-faint">What is waiting on you now</p>
          </div>
          <div className="h-px bg-rule" />
          {lines.length === 0 && <p className="t-body text-ink-2">Nothing is waiting. A client's reply or a late task shows here.</p>}
          {lines.map((one) => (
            <Link key={one.text} href={one.href} className={line}>
              <span className="flex pt-[6px]">
                <span className={"size-2 rounded-full " + one.dot} />
              </span>
              <span className="t-body min-w-0 flex-1">{one.text}</span>
            </Link>
          ))}
          <Link href="/notifications" className="t-label text-brand">
            Open all notifications
          </Link>
        </div>
      </Popover>
    );
  }

  // The phone's bell (v6 PH1): a 36px white circle in the top row, with the number when something waits.
  return (
    <Link
      href="/notifications"
      title={words}
      aria-label={words}
      className="relative flex size-9 shrink-0 items-center justify-center rounded-full bg-surface text-ink"
    >
      <Icon name="bell" size={18} className={rose ? "motion-safe:animate-[ring_600ms_ease-out]" : ""} />
      {bell.waiting > 0 && (
        <span aria-hidden="true" className={"absolute right-[8px] top-[8px] size-2 rounded-full " + (rose ? "badge-pulse " : "") + (bell.late ? "bg-danger" : "bg-brand")} />
      )}
    </Link>
  );
}
