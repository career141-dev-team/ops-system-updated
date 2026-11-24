"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import Bell from "@/app/Bell";
import FindOrDo from "@/app/FindOrDo";
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
  clerkEnabled = false,
}: {
  may: Record<string, boolean>;
  who: { name: string; role: string };
  bell: BellCount;
  chatOpen: boolean;
  viewing: string | null;
  chips: { role: string; label: string; active: boolean }[];
  dark: boolean;
  clerkEnabled?: boolean;
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
            workspaces fit beside it. The tabs never scroll (owner, 24 Nov). */}
        <header data-welcome="bar" className="flex h-[72px] items-center gap-3 overflow-hidden rounded-[36px] bg-surface pl-7 pr-5 shadow-card">
          <Link href="/" aria-label="My work" className="shrink-0">
            <Image src="/career141-lockup.png" alt="career141 · 20 years" width={178} height={56} priority className="h-[38px] w-[120px] object-contain" />
          </Link>
          <nav aria-label="Workspaces" className="ml-3 flex h-full items-stretch border-l border-rule">
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
                    className={"flex shrink-0 items-center whitespace-nowrap border-r border-rule px-[18px] text-[15px] font-light transition-colors hover:bg-sunk " + (here ? "bg-sunk text-ink shadow-[inset_0_-3px_0_var(--color-brand)]" : "text-ink-soft")}
                  >
                    {page.what}
                  </Link>
                );
              })}
          </nav>

          <div className="min-w-4 flex-1" />

          <FindOrDo />

          <QuickAdd />
          <Bell initial={bell} round />

          {/* The profile: who you are, and what is behind it. */}
          <ProfileMenu may={may} who={who} viewing={viewing} chips={chips} dark={dark} chatOpen={chatOpen} clerkEnabled={clerkEnabled} />
        </header>
      </div>
    </div>
  );
}
