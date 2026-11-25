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
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  if (!found) return null;
  return (
    <div
      aria-hidden="true"
      className={"pointer-events-none hidden justify-center transition-[opacity,transform] duration-200 motion-reduce:transition-none md:flex " + (scrolled ? "-translate-y-2 opacity-0" : "opacity-100")}
    >
      <div
        className="t-body-m flex h-10 min-w-[176px] items-center justify-center bg-sunk px-14 font-medium text-ink"
        style={{ clipPath: "polygon(0 0, 100% 0, calc(100% - 28px) 100%, 28px 100%)", borderBottomLeftRadius: 12, borderBottomRightRadius: 12 }}
      >
        {found.page.what}
      </div>
    </div>
  );
}
