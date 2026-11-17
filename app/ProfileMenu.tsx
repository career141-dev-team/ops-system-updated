"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { createPortal } from "react-dom";

import { setTheme, signOutAction, toggleChat, viewAs } from "@/app/actions";
import { NAV, isHere } from "@/lib/nav";
import type { WorkCount } from "@/lib/sectionWork";

/**
 * The profile and what is behind it (16 Nov, the owner's screenshot): a card under the avatar,
 * with the page - and the bar - blurred behind it.
 *
 * The same items in the same order as the old panel, then View as, Dark mode and Sign out.
 * Every control is a form posting a server action, so it works before the page has loaded.
 *
 * The veil and the card are drawn into <body>: the bar has a transform on it, which would make
 * a `fixed` child cover the bar and nothing else. Esc is handled by Keys (`data-close`).
 */
export default function ProfileMenu({
  may,
  counts,
  who,
  viewing,
  chips,
  dark,
  chatOpen,
}: {
  may: Record<string, boolean>;
  counts: Record<string, WorkCount>;
  who: { name: string; role: string };
  /** The role being previewed, in words, or null. */
  viewing: string | null;
  /** The roles this person may look through, the active one marked. */
  chips: { role: string; label: string; active: boolean }[];
  dark: boolean;
  chatOpen: boolean;
}) {
  const path = usePathname() ?? "/";
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  // The theme changes in place, so the card stays open: the page is told at once, the cookie follows.
  const [isDark, setIsDark] = useState(dark);
  const [, save] = useTransition();
  useEffect(() => setIsDark(dark), [dark]);
  const flip = () => {
    const next = isDark ? "light" : "dark";
    setIsDark(!isDark);
    document.documentElement.dataset.theme = next;
    save(() => setTheme(next));
  };
  useEffect(() => setMounted(true), []);
  useEffect(() => setOpen(false), [path]);

  const more = NAV[1];
  const mayShow = (needs?: string) => !needs || may[needs];
  const initials = who.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]!.toUpperCase())
    .join("");
  const item = "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[14px] text-ink-soft hover:bg-sunk hover:text-ink aria-[current=page]:text-brand";
  const rule = "mx-3 my-1 border-t border-rule";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="true"
        title={who.name + " · " + who.role}
        className="flex shrink-0 cursor-pointer items-center gap-2.5 text-left"
      >
        <span className="flex size-10 items-center justify-center rounded-full bg-bg-brand text-[14px] font-medium text-brand">{initials}</span>
        <span className="hidden flex-col 2xl:flex">
          <span className="text-[14px] font-medium leading-[21px] text-ink">{who.name}</span>
          <span className="text-[12px] font-medium leading-4 tracking-[0.4px] text-ink-faint">{viewing ? "Viewing as " + viewing : who.role}</span>
        </span>
      </button>

      {open &&
        mounted &&
        createPortal(
          <>
            <button type="button" data-close onClick={() => setOpen(false)} aria-label="Close the menu" className="fixed inset-0 z-[60] cursor-default bg-veil backdrop-blur-[4px]" />
            <div role="menu" className="fixed right-6 top-[96px] z-[70] flex max-h-[calc(100dvh/0.9-112px)] w-[300px] flex-col gap-0.5 overflow-y-auto rounded-panel bg-surface p-2 shadow-float">
              {/* The name and role open the profile (Figma 283:3530). */}
              <Link href="/account" aria-label="Open your profile" className="rounded-lg px-3 pb-2 pt-2 hover:bg-sunk">
                <p className="text-[16px] font-medium leading-[26px] text-ink">{who.name}</p>
                <p className="text-[14px] leading-[21px] text-ink-faint">{who.role}</p>
              </Link>
              <Link href="/account" aria-current={isHere(path, "/account") ? "page" : undefined} className={item}>
                <span className="flex-1">Account &amp; help</span>
              </Link>
              <Link href="/notifications" aria-current={isHere(path, "/notifications") ? "page" : undefined} className={item}>
                <span className="flex-1">Notifications</span>
              </Link>
              {more.pages
                .filter((page) => mayShow(page.needs))
                .map((page) => {
                  const count = counts[page.href];
                  return (
                    <Link key={page.href} href={page.href} title={page.about} aria-current={isHere(path, page.href) ? "page" : undefined} className={item}>
                      <span className="flex-1">{page.what}</span>
                      {count && count.waiting > 0 && <span className={"text-[12px] " + (count.late ? "text-danger" : "text-ink-faint")}>{count.waiting}</span>}
                    </Link>
                  );
                })}
              {/* AURA's column, open or shut (docs/31). */}
              <form action={toggleChat}>
                <input type="hidden" name="back" value={path} />
                <button aria-pressed={chatOpen} className={item}>
                  {chatOpen ? "Close AURA" : "Open AURA"}
                </button>
              </form>

              {chips.length > 1 && (
                <>
                  <div className={rule} />
                  <p className="px-3 pt-1 text-[14px] leading-[21px] text-ink-faint">View as (until sign-in)</p>
                  <div className="flex flex-wrap gap-1.5 px-3 pb-1 pt-1.5">
                    {chips.map((chip) => (
                      <form key={chip.role} action={viewAs}>
                        <input type="hidden" name="back" value={path} />
                        <input type="hidden" name="role" value={chip.role} />
                        <button
                          aria-pressed={chip.active}
                          className={"rounded-full px-3 py-1 text-[14px] leading-[21px] " + (chip.active ? "bg-ink text-ink-inverse" : "bg-sunk text-ink-soft hover:text-ink")}
                        >
                          {chip.label}
                        </button>
                      </form>
                    ))}
                  </div>
                </>
              )}

              <div className={rule} />
              <button type="button" onClick={flip} aria-pressed={isDark} className={item}>
                <span className="flex-1">Dark mode</span>
                <span className="text-ink-faint">{isDark ? "On" : "Off"}</span>
              </button>
              <form action={signOutAction}>
                <button className={item}>Sign out</button>
              </form>
              <p className="mx-3 mt-1 border-t border-rule pt-2 text-[12px] text-ink-faint">Test data only</p>
            </div>
          </>,
          document.body,
        )}
    </>
  );
}
