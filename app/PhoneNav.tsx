"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import Bell from "@/app/Bell";
import Icon, { ICON_FOR } from "@/app/Icon";
import QuickAdd from "@/app/QuickAdd";
import type { Bell as BellCount } from "@/lib/bell";
import { NAV, PHONE_ONLY, PHONE_PAGES, isHere } from "@/lib/nav";
import type { WorkCount } from "@/lib/sectionWork";

/**
 * The phone's navigation (UX order 7). The desk's is the top bar (TopBar,
 * 13 Nov), which replaced the sidebar this file used to hold as well.
 *
 * On a phone (under 768px, 8 Nov) the 232px column took the screen and left
 * the page 140px, so: a top bar with the name, the bell and Add, a menu that
 * opens *in the flow* and pushes the page down (a `details`, never a
 * drawer - the owner's rule), and a bar along the bottom with the four
 * pages a phone is for. The desk is for reading CVs; the phone is for the
 * call that just came in and the reply that just landed.
 *
 * It is a client component only because it needs to know which page you are
 * on. It holds no state, fetches nothing, and nothing in it hides behind a
 * hover.
 */
export default function PhoneNav({
  may,
  counts,
  who,
  bell,
  clients,
}: {
  may: Record<string, boolean>;
  counts: Record<string, WorkCount>;
  who: { name: string; role: string };
  /** What is waiting on this person right now, kept live by the bell itself. */
  bell: BellCount;
  /** Names for the quick-add box to file a call or a note under. */
  clients: { id: string; name: string }[];
}) {
  const path = usePathname() ?? "/";

  const pages = (
    <div className="flex flex-col gap-4">
      {NAV.map((section) => {
        const shown = section.pages.filter((page) => !page.needs || may[page.needs]);
        if (!shown.length) return null;
        return (
          <div key={section.key} className="flex flex-col gap-0.5">
            {section.what && (
              <p className="px-2 pb-1 text-[11px] uppercase tracking-[0.08em] text-ink-faint">{section.what}</p>
            )}
            {shown.map((page) => {
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
  );

  const find = (
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
  );

  return (
    <>
      {/* The phone: a bar on top, with the menu and Add opening in the flow. */}
      <header className="border-b border-shell-rule bg-shell px-3 py-2 md:hidden">
        <div className="flex items-center gap-2 px-1">
          <span className="h-2.5 w-2.5 rounded-full bg-brand" aria-hidden="true" />
          <span className="min-w-0 flex-1 truncate text-[14px] font-medium">Career 141 Ops</span>
          <Bell initial={bell} />
        </div>
        <div className="mt-2 flex flex-col gap-1">
          <QuickAdd clients={clients} />
          <details className="group rounded-lg">
            <summary className="flex cursor-pointer select-none items-center gap-2 rounded-lg px-2.5 py-[7px] text-[13.5px] text-ink-soft hover:bg-shell-sunk hover:text-ink">
              <Icon name="menu" size={16} />
              <span className="flex-1">Everything</span>
              <span className="text-[11px] text-ink-faint group-open:hidden">{who.name}</span>
            </summary>
            <div className="flex flex-col gap-3 px-1 pb-2 pt-2">
              {find}
              {pages}
              <p className="px-2 text-[11.5px] text-ink-faint">
                {who.name} · {who.role} · test data only
              </p>
            </div>
          </details>
        </div>
      </header>

      {/* The phone: the four pages a phone is for, along the bottom. */}
      <nav
        aria-label="The phone's pages"
        className="fixed inset-x-0 bottom-0 z-10 flex border-t border-shell-rule bg-shell md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {PHONE_PAGES.map((href) => {
          const page = NAV.flatMap((s) => s.pages).find((p) => p.href === href) ?? PHONE_ONLY[href];
          if (!page) return null;
          const here = isHere(path, href);
          const count = counts[href];
          return (
            <Link
              key={href}
              href={href}
              aria-current={here ? "page" : undefined}
              className={
                "relative flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] " +
                (here ? "font-medium text-brand" : "text-ink-soft")
              }
            >
              <Icon name={ICON_FOR[href] ?? "work"} size={20} />
              <span>{page.what}</span>
              {count && count.waiting > 0 && (
                <span className={"absolute right-[18%] top-1 text-[10.5px] " + (count.late ? "text-danger" : "text-ink-faint")}>
                  {count.waiting}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
