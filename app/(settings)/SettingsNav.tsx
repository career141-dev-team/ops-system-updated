"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { label: "People and roles", href: "/ta" },
  { label: "Templates and the ESA", href: "/templates" },
  { label: "What needs approval", href: "/ai" },
  { label: "Timers and working days", href: "/settings" },
  { label: "Channels & files", href: "/files" },
  { label: "Automation health", href: "/health" },
  { label: "Holidays", href: "/holidays" },
  { label: "Import", href: "/import" },
];

export default function SettingsNav() {
  const path = usePathname() ?? "/settings";

  return (
    <aside className="w-full shrink-0 border-b border-edge pb-4 md:w-[250px] md:border-b-0 md:border-r md:pb-0 md:pr-6">
      <h1 className="mb-4 font-serif text-[26px] font-medium leading-[1.2] text-ink">
        Settings
      </h1>
      <nav className="flex flex-row flex-wrap gap-1 md:flex-col">
        {LINKS.map((item) => {
          const active =
            item.href === "/settings"
              ? path === "/settings"
              : path === item.href || path.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-[14px] px-3.5 py-2.5 text-[14.5px] transition ${
                active
                  ? "bg-sunk font-medium text-ink"
                  : "text-ink-soft hover:bg-sunk/60 hover:text-ink"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
