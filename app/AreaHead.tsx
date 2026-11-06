"use client";

import { usePathname } from "next/navigation";

import { Tabs } from "@/app/ui";
import type { Tab } from "@/lib/tabs";

/**
 * An area's title and its one tab bar (25, section 2).
 *
 * It shows on the area's own list pages and **disappears on a record**. A
 * position's page has its own bar - Overview, CV sets, Interviews - and two
 * bars stacked is exactly the "tabs inside tabs" the owner was looking at
 * when he said the screens were sloppy (5 Nov).
 */
export default function AreaHead({
  title,
  about,
  tabs,
}: {
  title: string;
  about: string;
  tabs: Tab[];
}) {
  const path = usePathname() ?? "";
  const on = tabs.find((tab) => path === tab.href);
  // Deeper than a tab's own page: we are on one thing, and it speaks for
  // itself.
  if (!on) return null;

  return (
    <>
      <div>
        <h1 className="text-[18px] font-medium leading-tight">{title}</h1>
        <p className="mt-1 max-w-[80ch] text-[12.5px] text-ink-soft">{about}</p>
      </div>
      <Tabs tabs={tabs} here={on.key} />
    </>
  );
}
