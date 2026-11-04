"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { NAV, isHere, sectionFor } from "@/lib/nav";

/**
 * The header's two levels (23, section 3).
 *
 * Five sections always visible, and under them the pages of the one you are
 * in. It is a client component only because it needs to know which page that
 * is; it holds no state of its own and fetches nothing.
 *
 * The rule it exists to enforce: never more than two levels, and nothing
 * hidden behind a hover. Twenty-four links in one row was the fault
 * (23, section 1).
 */
export default function Nav({ may }: { may: Record<string, boolean> }) {
  const path = usePathname() ?? "/";
  const here = sectionFor(path);
  const pages = here.pages.filter((page) => !page.needs || may[page.needs]);

  return (
    <>
      <nav className="flex flex-wrap items-center gap-x-5 gap-y-1 text-[13.5px]">
        {NAV.map((section) => {
          const current = section.key === here.key;
          const first = section.pages.find((page) => !page.needs || may[page.needs]) ?? section.pages[0];
          return (
            <Link
              key={section.key}
              href={first.href}
              className={current ? "font-medium text-ink" : "text-ink-soft hover:text-ink"}
            >
              {section.what}
            </Link>
          );
        })}
      </nav>

      {pages.length > 1 && (
        <nav className="flex w-full flex-wrap items-center gap-x-4 gap-y-1 text-[12.5px]">
          {pages.map((page) => (
            <Link
              key={page.href}
              href={page.href}
              className={
                isHere(path, page.href)
                  ? "rounded-full bg-paper px-2.5 py-0.5 text-ink"
                  : "px-2.5 py-0.5 text-ink-soft hover:text-ink"
              }
            >
              {page.what}
            </Link>
          ))}
        </nav>
      )}
    </>
  );
}
