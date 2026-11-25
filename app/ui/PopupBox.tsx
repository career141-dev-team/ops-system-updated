import Link from "next/link";
import type { ReactNode } from "react";

import Icon from "@/app/Icon";
import PanelOpen from "@/app/ui/PanelOpen";

/**
 * A pop-up box in the middle of the screen, with the page behind it blurred (25 Nov, the owner).
 *
 * The same native <dialog> as the send modals: open `?panel=<name>` in the address, so Back closes it and
 * a reload keeps it; with script, `PanelOpen` makes it modal (focus held, Escape and a click outside close it).
 * Forms inside post to their own server actions as ever.
 */
export default function PopupBox({
  title,
  sub,
  right,
  closeHref,
  children,
}: {
  title: string;
  sub?: string;
  /** Something beside the close button, such as a "New position" link. */
  right?: ReactNode;
  closeHref: string;
  children: ReactNode;
}) {
  return (
    <dialog open aria-labelledby="popup-title" className="send-modal popup-box">
      <PanelOpen closeHref={closeHref} />
      <div className="flex max-h-[calc(100dvh-48px)] flex-col gap-5 overflow-y-auto p-7">
        <div className="flex items-start gap-3">
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <h2 id="popup-title" className="t-h2">
              {title}
            </h2>
            {sub && <p className="t-small text-ink-3">{sub}</p>}
          </div>
          {right}
          <Link href={closeHref} scroll={false} replace aria-label="Close" className="flex size-10 shrink-0 items-center justify-center rounded-full border border-rule bg-surface text-ink hover:bg-sunk">
            <Icon name="x" size={18} />
          </Link>
        </div>
        {children}
      </div>
    </dialog>
  );
}
