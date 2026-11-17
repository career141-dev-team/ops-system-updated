"use client";

import { usePathname, useSearchParams } from "next/navigation";

import { tabFor } from "@/lib/nav";

/**
 * The tab hanging from the top of the page card (16 Nov, Figma 249:14267 "Notch tab"): it
 * names where you are, the same entry the bar marks. A trapezoid in the page's own grey, so
 * it reads as a bite out of the card, in the dark theme too. Desk only - a phone has its own bar.
 */
export default function WorkspaceNotch() {
  const path = usePathname() ?? "/";
  // My Work's Today and Messages have no tab in the frames (249:8477, 249:9038); To approve has.
  const view = useSearchParams().get("view");
  // Today has no tab; To approve and Messages do (Figma 391:7384 names its tab "Messages").
  const bare = path === "/" && view !== "approve" && view !== "messages";
  const title = bare ? null : path === "/" && view === "messages" ? "Messages" : tabFor(path);
  // A strip as tall as the gap under the bar; the tab hangs from its foot, into the card.
  if (!title) return <div className="hidden h-8 md:block" aria-hidden="true" />;
  return (
    <div className="relative z-[2] hidden h-8 md:block">
      <div className="absolute left-1/2 top-full h-11 w-[260px] -translate-x-1/2">
        <svg viewBox="0 0 260 44" className="absolute inset-0 size-full rotate-180 fill-paper" aria-hidden="true">
          <path d="M0 44C22 44 30 40 36 30L46 12C52 3 58 0 72 0H188C202 0 208 3 214 12L224 30C230 40 238 44 260 44Z" />
        </svg>
        <p className="relative pt-1.5 text-center text-[16px] font-medium leading-[26px] text-ink">
          <span className="relative inline-block">
            {title}
            {/* A bar runs under the heading each time a page arrives (17 Nov, the owner); the key makes it start again. */}
            <span key={path} aria-hidden="true" className="notch-bar absolute inset-x-0 -bottom-[3px] h-[2px] rounded-full bg-gradient-to-r from-brand to-success" />
          </span>
        </p>
      </div>
    </div>
  );
}
