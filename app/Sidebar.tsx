"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import Icon, { ICON_FOR } from "@/app/Icon";
import { NAV, isHere } from "@/lib/nav";
import type { WorkCount } from "@/lib/sectionWork";

/**
 * The sidebar (24, section 13).
 *
 * The owner showed two screens of an ATS on 5 November and asked for this
 * shape: everything reachable from anywhere, in groups that do not change as
 * you work - the day, the workspace, the records, the tools. The *work*
 * itself is not in the menu; it is on the board, which is the second item.
 *
 * A top bar was wrong for this system. Twenty-six pages do not fit across a
 * screen, and the ones that did fit were the ones somebody had room for
 * rather than the ones somebody needed.
 *
 * It is a client component only because it needs to know which page you are
 * on. It holds no state, fetches nothing, and nothing in it hides behind a
 * hover.
 */
export default function Sidebar({
  may,
  counts,
  who,
}: {
  may: Record<string, boolean>;
  counts: Record<string, WorkCount>;
  who: { name: string; role: string };
}) {
  const path = usePathname() ?? "/";

  return (
    <nav className="flex h-screen w-[232px] shrink-0 flex-col gap-3 border-r border-shell-rule bg-shell px-3 py-4">
      <div className="flex items-center gap-2 px-2">
        <span className="h-2.5 w-2.5 rounded-full bg-brand" aria-hidden="true" />
        <span className="text-[14px] font-medium">Career 141 Ops</span>
      </div>

      {/* One box over everything the desk keeps. A person knows the client's
          name, not which of eight places a thing is filed under. */}
      <form
        action="/find"
        className="flex items-center gap-2 rounded-lg border border-shell-rule bg-surface px-2.5 py-1.5 transition-colors focus-within:border-brand"
      >
        <Icon name="search" className="text-ink-faint" size={15} />
        <input
          name="q"
          placeholder="Find anything"
          aria-label="Find a client, a position, a set, an invoice"
          className="w-full bg-transparent text-[12.5px] outline-none placeholder:text-ink-faint"
        />
      </form>

      <div className="flex flex-1 flex-col gap-4 overflow-y-auto">
        {NAV.map((section) => {
          const pages = section.pages.filter((page) => !page.needs || may[page.needs]);
          if (!pages.length) return null;
          return (
            <div key={section.key} className="flex flex-col gap-0.5">
              {section.what && (
                <p className="px-2 pb-1 text-[11px] uppercase tracking-[0.08em] text-ink-faint">{section.what}</p>
              )}
              {pages.map((page) => {
                const here = isHere(path, page.href);
                const count = counts[page.href];
                return (
                  <Link
                    key={page.href}
                    href={page.href}
                    title={page.about}
                    aria-current={here ? "page" : undefined}
                    className={
                      "flex items-center gap-2 rounded-lg px-2.5 py-[7px] text-[13.5px] transition-colors " +
                      (here ? "bg-surface font-medium text-brand shadow-[0_1px_2px_rgba(22,24,26,0.06)]" : "text-ink-soft hover:bg-shell-sunk hover:text-ink")
                    }
                  >
                    <Icon name={ICON_FOR[page.href] ?? "work"} size={16} />
                    <span className="min-w-0 flex-1 truncate">{page.what}</span>
                    {count && count.waiting > 0 && (
                      <span className={"text-[12px] " + (count.late ? "text-danger" : "text-ink-faint")}>
                        {count.waiting}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          );
        })}
      </div>

      <div className="border-t border-shell-rule px-2.5 pt-3">
        <p className="text-[12.5px]">{who.name}</p>
        <p className="text-[11.5px] text-ink-faint">{who.role}</p>
        <p className="mt-2 inline-block rounded-md bg-bg-warning px-2 py-0.5 text-[11px] text-warning">
          Test data only
        </p>
      </div>
    </nav>
  );
}
