"use client";

import { usePathname } from "next/navigation";

import { pageAndSectionFor } from "@/lib/nav";

/**
 * The page's name in a notch under the bar (25 Nov, the owner's reference from another Career 141 system):
 * a white tab hanging from the top of the page, "My work", "Inbox", "Clients" and so on.
 *
 * It is ordinary page content, not fixed, so it scrolls away with the page. A path that is no bar entry (a
 * profile, a notification) has no notch. The desk only; a phone has its own bars.
 */
export default function PageNotch() {
  const found = pageAndSectionFor(usePathname() ?? "/");
  if (!found) return null;
  return (
    <div aria-hidden="true" className="pointer-events-none -mt-2 mb-3 hidden justify-center md:flex">
      {/* clip-path would clip a shadow, so the shadow sits on the wrapper. */}
      <div className="drop-shadow-[0_2px_6px_rgba(16,24,40,0.08)]">
        <div
          className="t-body-m flex h-10 min-w-[168px] items-center justify-center bg-surface px-12 text-ink"
          style={{ clipPath: "polygon(0 0, 100% 0, calc(100% - 26px) 100%, 26px 100%)", borderBottomLeftRadius: 10, borderBottomRightRadius: 10 }}
        >
          {found.page.what}
        </div>
      </div>
    </div>
  );
}
