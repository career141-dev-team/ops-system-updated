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
import { barShown } from "@/lib/topBar";

/**
 * The top bar (19 Nov, the v6 design, Figma frame 128:2).
 *
 * A white pill 72px high: the logo, the eight workspaces, "Search or ask AURA" (it submits to
 * /find, and / jumps to it), the round black + for Add (G3), the bell (G4) and the profile.
 * Accounts and Settings show only to people who may open them.
 *
 * It hides once the page is scrolled and comes back for the pointer at the top edge (the owner,
 * 13 Nov); `src/lib/topBar.ts` decides, and its test says who must never lose it. It sits in its
 * own space at the top of the page, so at the top nothing is under it; scrolled, it slides over
 * the page when called back.
 *
 * The desk only. A phone keeps its own bar and bottom bar (PhoneNav).
 */
export default function TopBar({
  may,
  who,
  bell,
  chatOpen,
  viewing,
  chips,
  dark,
}: {
  may: Record<string, boolean>;
  who: { name: string; role: string };
  bell: BellCount;
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

  return (
    // The space the bar takes at the top of the page (24px of air, then the 72px bar), so nothing starts under it.
    <div className="hidden h-[96px] md:block">
      <div
        ref={bar}
        className={
          "fixed inset-x-0 top-0 z-20 px-10 pt-6 transition-transform duration-200 ease-out motion-reduce:transition-none " +
          (shown ? "translate-y-0" : "-translate-y-[120%]")
        }
      >
        {/* Drawn at 1920px. Below 1536px (a laptop) the search narrows and the name goes, so the
            workspaces fit beside it; under 1280px the workspaces scroll sideways. */}
        <header data-welcome="bar" className="flex h-[72px] items-center gap-0.5 rounded-[36px] bg-surface pl-7 pr-3.5 shadow-card">
          <Link href="/" aria-label="My work" className="shrink-0">
            <Image src="/career141-lockup.png" alt="career141 · 20 years" width={178} height={56} priority className="h-[38px] w-[120px] object-contain" />
          </Link>
          <span className="w-7 shrink-0" aria-hidden="true" />

          <nav aria-label="Workspaces" className="flex min-w-0 items-center gap-0.5 overflow-x-auto">
            {workspaces.pages
              .filter((page) => !page.needs || may[page.needs])
              .map((page) => {
                const here = isHere(path, page.href);
                return (
                  <Link
                    key={page.href}
                    href={page.href}
                    title={page.about}
                    aria-current={here ? "page" : undefined}
                    className={"t-body shrink-0 whitespace-nowrap rounded-full px-3.5 py-[9px] text-ink transition-colors hover:bg-sunk " + (here ? "bg-sunk font-medium" : "")}
                  >
                    {page.what}
                  </Link>
                );
              })}
          </nav>

          <div className="min-w-4 flex-1" />

          <form
            action="/find"
            className="mr-0.5 flex h-11 w-[200px] shrink-0 items-center gap-2.5 rounded-full bg-sunk px-4 transition-shadow focus-within:ring-1 focus-within:ring-brand/40 2xl:w-[300px]"
          >
            <input
              name="q"
              autoComplete="off"
              placeholder="Search or ask AURA"
              aria-label="Search the desk or ask AURA"
              className="t-body min-w-0 flex-1 bg-transparent outline-none placeholder:text-ink-3"
            />
            <kbd className="t-label hidden rounded-[6px] border border-rule px-[7px] py-px font-sans text-ink-3 2xl:inline">/</kbd>
            <button type="submit" aria-label="Search" className="2xl:hidden">
              <Icon name="search" size={16} className="text-ink-3" />
            </button>
          </form>

          <QuickAdd />
          <Bell initial={bell} round />

          {/* The profile: who you are, and what is behind it. */}
          <ProfileMenu may={may} who={who} viewing={viewing} chips={chips} dark={dark} chatOpen={chatOpen} />
        </header>
      </div>
    </div>
  );
}
