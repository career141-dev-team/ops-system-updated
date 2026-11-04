"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { NAV, isHere, pageAndSectionFor } from "@/lib/nav";
import type { WorkCount } from "@/lib/sectionWork";

/**
 * The header (24, section 3).
 *
 * Five sections across the top. Clicking one opens its pages right where you
 * are, each with a line saying what it is for and how much is waiting on it;
 * clicking it again closes them. It does not take you anywhere - the owner's
 * complaint on 4 November was that you could not look at what was in a section
 * without leaving the page you were reading.
 *
 * The panel is in the flow of the page, not over it: the header grows and the
 * page moves down. That keeps the owner's rule - no overlays, no modals, no
 * drawers - while still being a two-level menu.
 *
 * There is no open/close animation on purpose. A menu is used dozens of times
 * a day, and anything that has to play before you can read makes the whole
 * desk feel slower.
 */
export default function Nav({
  may,
  counts,
}: {
  may: Record<string, boolean>;
  counts: Record<string, WorkCount>;
}) {
  const path = usePathname() ?? "/";
  const here = pageAndSectionFor(path);
  const [open, setOpen] = useState<string | null>(null);

  // Moving to another page closes the menu: it has done its job, and leaving
  // it open would push every screen down by four rows.
  useEffect(() => setOpen(null), [path]);

  const shown = open ? NAV.find((section) => section.key === open) : null;
  const pagesOf = (key: string) => {
    const section = NAV.find((s) => s.key === key);
    return (section?.pages ?? []).filter((page) => !page.needs || may[page.needs]);
  };

  return (
    <>
      <nav className="flex flex-wrap items-center gap-x-1 gap-y-1 text-[13.5px]">
        {NAV.map((section) => {
          const current = section.key === here?.section.key;
          const count = counts[section.key];
          return (
            <button
              key={section.key}
              type="button"
              aria-expanded={open === section.key}
              aria-controls="section-pages"
              onClick={() => setOpen(open === section.key ? null : section.key)}
              className={
                "flex items-center gap-1.5 rounded-full px-3 py-1 transition-transform duration-150 ease-out active:scale-[0.97] " +
                (open === section.key
                  ? "bg-brand text-white"
                  : current
                    ? "bg-paper font-medium text-ink"
                    : "text-ink-soft hover:text-ink")
              }
            >
              {section.what}
              {count && count.waiting > 0 && (
                <span
                  className={
                    "text-[11.5px] " +
                    (open === section.key ? "text-white" : count.late ? "text-danger" : "text-ink-faint")
                  }
                >
                  {count.waiting}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div id="section-pages" className="w-full">
        {shown ? (
          <div className="border-t border-rule pt-3">
            <p className="text-[12.5px] text-ink-soft">
              <span className="font-medium text-ink">{shown.what}</span> · {shown.about}
            </p>
            <div className="mt-2 grid gap-x-6 gap-y-1 sm:grid-cols-2 lg:grid-cols-3">
              {pagesOf(shown.key).map((page) => {
                const count = counts[page.href];
                return (
                  <Link
                    key={page.href}
                    href={page.href}
                    className={
                      "flex items-baseline gap-2 rounded-lg px-2 py-1.5 hover:bg-paper " +
                      (isHere(path, page.href) ? "bg-paper" : "")
                    }
                  >
                    <span className="min-w-0 flex-1">
                      <span className="text-[13.5px]">{page.what}</span>
                      <span className="mt-0.5 block text-[12px] text-ink-soft">{page.about}</span>
                    </span>
                    {count && count.waiting > 0 && (
                      <span className={"text-[12px] " + (count.late ? "text-danger" : "text-ink-faint")}>
                        {count.waiting}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ) : (
          here && (
            <p className="text-[12px] text-ink-soft">
              {here.section.what} · <span className="text-ink">{here.page.what}</span> — {here.page.about}
            </p>
          )
        )}
      </div>
    </>
  );
}
