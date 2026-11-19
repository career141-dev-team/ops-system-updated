import Link from "next/link";
import type { ReactNode } from "react";

import Icon from "@/app/Icon";
import PanelOpen from "@/app/ui/PanelOpen";

/**
 * A state panel: the 680px drawer on the right (v6 frames R1 and its kin, 19 Nov).
 *
 * A page renders one when `?panel=` names it, and passes `closeHref(path, params)` from
 * `src/lib/panel.ts`. It is a native <dialog>: with no script it is drawn open in place, and the
 * X is a plain link back to the page; with script, `PanelOpen` makes it modal, so focus is held
 * inside, Escape closes it and the page behind is dimmed - all by the browser, not by us.
 *
 * Forms inside post to the same server actions as ever, with a hidden `back` input holding
 * the page's address. Use `PanelSection` for the blocks the frames separate with a hairline.
 */
export default function Panel({
  title,
  sub,
  kicker,
  closeHref,
  children,
}: {
  title: string;
  /** The line under the title: "Serendib Foods > Sales Executive > Round 1". */
  sub?: string;
  /** The small capital caption over the title. */
  kicker?: string;
  closeHref: string;
  children: ReactNode;
}) {
  return (
    <dialog open aria-labelledby="panel-title" className="panel">
      <PanelOpen closeHref={closeHref} />
      <div className="flex flex-col gap-0.5">
        {kicker && <p className="t-micro text-ink-faint">{kicker}</p>}
        <div className="flex items-start gap-4 pt-1">
          <h2 id="panel-title" className="t-display min-w-0 flex-1 [overflow-wrap:anywhere]">
            {title}
          </h2>
          <Link
            href={closeHref}
            scroll={false}
            replace
            aria-label="Close"
            className="mt-8 flex size-10 shrink-0 items-center justify-center rounded-full border border-rule bg-surface text-ink hover:bg-sunk"
          >
            <Icon name="x" size={18} />
          </Link>
        </div>
        {sub && <p className="t-small pt-1 text-ink-faint">{sub}</p>}
      </div>
      <div className="mt-[22px] flex flex-col">{children}</div>
    </dialog>
  );
}

/** One block of a panel: a hairline above it, a small capital heading, then its content. */
export function PanelSection({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3 border-t border-rule py-[22px] first:border-t-0 first:pt-0">
      {title && <h3 className="t-micro text-ink-faint">{title}</h3>}
      {children}
    </section>
  );
}
