"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { pageAndSectionFor } from "@/lib/nav";

/**
 * The page's name in a notch hanging from the top edge of the white sheet (25 Nov, the owner's reference
 * from another Career 141 system): "My work", "Inbox", "Clients" and so on, wider at the top.
 *
 * It fades out as soon as the page is scrolled and comes back at the top. A path that is no bar entry (a
 * profile, a notification) has no notch. The desk only; a phone has its own bars.
 */
export default function PageNotch() {
  const found = pageAndSectionFor(usePathname() ?? "/");
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 0);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  if (!found) return null;
  return (
    <div
      aria-hidden="true"
      className={"pointer-events-none hidden justify-center transition-[opacity,transform] duration-150 motion-reduce:transition-none md:flex " + (scrolled ? "-translate-y-2 opacity-0" : "opacity-100")}
    >
      <Cap />
      <div className="t-body-m -mx-px flex h-10 min-w-[100px] items-center justify-center bg-sunk px-2 font-medium text-ink">{found.page.what}</div>
      <Cap flip />
    </div>
  );
}

/** One slanted end of the notch, its lower corner rounded; the right one is the left turned over. */
function Cap({ flip = false }: { flip?: boolean }) {
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" className={"shrink-0 fill-sunk " + (flip ? "-scale-x-100" : "")}>
      <path d="M0 0H40V40H36Q28 40 23.4 33.4Z" />
    </svg>
  );
}
