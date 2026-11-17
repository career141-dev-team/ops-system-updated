"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import Bell from "@/app/Bell";
import Icon from "@/app/Icon";
import ProfileMenu from "@/app/ProfileMenu";
import QuickAdd from "@/app/QuickAdd";
import type { Bell as BellCount } from "@/lib/bell";
import { NAV, isHere } from "@/lib/nav";
import type { WorkCount } from "@/lib/sectionWork";
import { barShown } from "@/lib/topBar";

/**
 * The top bar (13 Nov, the approved Figma "Top nav", frame 68:2791).
 *
 * The logo, the workspaces, "Search or ask AURA", the round + for quick-add,
 * the bell and the profile. Behind the profile: the board, the inbox, the
 * chat and Settings ("Settings, Help, Sign out live in the profile page").
 *
 * It hides once the page is scrolled and comes back for the pointer at the
 * top edge (the owner, 13 Nov); `src/lib/topBar.ts` decides, and its test
 * says who must never lose it. It sits in its own space at the top of the
 * page, so at the top nothing is under it; scrolled, it slides over the page
 * when called back. That is an overlay, which this app otherwise forbids:
 * the owner chose it for the bar, and for the card that opens from the profile,
 * with the page blurred behind it (16 Nov, `ProfileMenu`; docs/09).
 *
 * The desk only. A phone keeps its own bar and bottom bar (PhoneNav).
 */
export default function TopBar({
  may,
  counts,
  who,
  bell,
  clients,
  chatOpen,
  viewing,
  chips,
  dark,
}: {
  may: Record<string, boolean>;
  counts: Record<string, WorkCount>;
  who: { name: string; role: string };
  bell: BellCount;
  clients: { id: string; name: string }[];
  chatOpen: boolean;
  viewing: string | null;
  chips: { role: string; label: string; active: boolean }[];
  dark: boolean;
}) {
  const path = usePathname() ?? "/";
  const bar = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(true);

  useEffect(() => {
    const state = { scrollY: window.scrollY, pointerY: null as number | null, overBar: false, focusWithin: false };
    const touch = window.matchMedia("(hover: none)").matches;
    const decide = () => setShown(barShown({ ...state, touch }));
    const onScroll = () => {
      state.scrollY = window.scrollY;
      decide();
    };
    const onMove = (e: PointerEvent) => {
      state.pointerY = e.clientY;
      state.overBar = Boolean(bar.current?.contains(e.target as Node));
      decide();
    };
    const onLeave = () => {
      state.pointerY = null;
      state.overBar = false;
      decide();
    };
    const onFocus = () => {
      state.focusWithin = Boolean(bar.current?.contains(document.activeElement));
      decide();
    };
    // Focus has not moved yet when focusout fires, so look a tick later.
    const onBlur = () => setTimeout(onFocus, 0);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("pointermove", onMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    document.addEventListener("focusin", onFocus);
    document.addEventListener("focusout", onBlur);
    decide();
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", onLeave);
      document.removeEventListener("focusin", onFocus);
      document.removeEventListener("focusout", onBlur);
    };
  }, []);

  const [workspaces] = NAV;
  const mayShow = (needs?: string) => !needs || may[needs];

  return (
    // The space the bar takes at the top of the page, so nothing starts under it.
    <div className="hidden h-[116px] md:block">
      <div
        ref={bar}
        className={
          "fixed inset-x-0 top-0 z-20 px-6 pt-6 transition-transform duration-200 ease-out motion-reduce:transition-none " +
          (shown ? "translate-y-0" : "-translate-y-[120%]")
        }
      >
        {/* The design is drawn at 1920px. Below 1536px (a laptop) the gaps, the
            logo and the search narrow and the name goes, so the
            workspaces fit beside the search; under 1280px the workspaces scroll sideways. */}
        <header data-welcome="bar" className="flex h-20 items-center gap-3 rounded-[40px] bg-surface px-6 py-2.5 shadow-card 2xl:gap-5">
          <Link href="/" aria-label="My Work" className="shrink-0">
            <Image
              src="/career141-lockup.png"
              alt="career141 · 20 years"
              width={178}
              height={56}
              priority
              className="h-auto w-[150px] 2xl:w-[178px]"
            />
          </Link>

          <nav aria-label="Workspaces" className="flex min-w-0 items-center gap-0.5 overflow-x-auto">
            {workspaces.pages
              .filter((page) => mayShow(page.needs))
              .map((page) => {
                const here = isHere(path, page.href);
                const count = counts[page.href];
                return (
                  <Link
                    key={page.href}
                    href={page.href}
                    title={page.about}
                    aria-current={here ? "page" : undefined}
                    className={
                      "flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-2.5 text-[14px] leading-[21px] transition-colors 2xl:px-3.5 " +
                      (here ? "bg-sunk text-ink" : "text-ink-soft hover:bg-sunk hover:text-ink")
                    }
                  >
                    {page.what}
                    {count && count.waiting > 0 && (
                      <span className={"text-[12px] " + (count.late ? "text-danger" : "text-ink-faint")}>{count.waiting}</span>
                    )}
                  </Link>
                );
              })}
          </nav>

          <div className="min-w-0 flex-1" />

          <form
            action="/find"
            className="flex h-[46px] w-[200px] shrink-0 items-center 2xl:w-[300px] gap-2.5 rounded-full bg-sunk pl-4 pr-2 transition-shadow focus-within:ring-1 focus-within:ring-brand/40"
          >
            <Icon name="search" size={18} className="shrink-0 text-ink-faint" />
            <input
              name="q"
              placeholder="Search or ask AURA"
              aria-label="Search the desk"
              className="min-w-0 flex-1 bg-transparent text-[14px] leading-[21px] outline-none placeholder:text-ink-faint"
            />
            <kbd className="hidden rounded-md bg-surface 2xl:inline px-[7px] py-0.5 font-sans text-[12px] font-medium leading-4 tracking-[0.4px] text-ink-faint">
              /
            </kbd>
          </form>

          <QuickAdd clients={clients} inBar />
          <Bell initial={bell} round />

          {/* The profile: who you are, and the pages that are not workspaces. */}
          <ProfileMenu may={may} counts={counts} who={who} viewing={viewing} chips={chips} dark={dark} chatOpen={chatOpen} />
        </header>
      </div>
    </div>
  );
}
