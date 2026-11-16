"use client";

import { usePathname } from "next/navigation";

import { workspaceTitle } from "@/lib/nav";

/**
 * The tab above the page card (16 Nov, the Figma "Notch tab"): it names where you are, the
 * same entry the bar marks. Drawn in the surface colour, so the card and its tab are one
 * shape, in the dark theme too. Desk only - a phone has its own bar.
 */
export default function WorkspaceNotch() {
  const title = workspaceTitle(usePathname() ?? "/");
  if (!title) return <div className="hidden h-11 md:block" aria-hidden="true" />;
  return (
    <div className="relative mx-auto hidden h-11 w-[260px] md:block" aria-hidden="true">
      <svg viewBox="0 0 260 44" className="absolute inset-0 size-full fill-surface drop-shadow-[0_-1px_1px_rgb(15_23_31/0.03)]">
        <path d="M0 44C14 44 20 40 22 30 24 14 32 0 52 0H208C228 0 236 14 238 30 240 40 246 44 260 44Z" />
      </svg>
      <p className="relative pt-3 text-center text-[16px] font-medium leading-[26px] text-ink">{title}</p>
    </div>
  );
}
