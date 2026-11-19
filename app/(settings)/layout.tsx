"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import SettingsNav from "@/app/(settings)/SettingsNav";

/**
 * Settings area layout (v6 S1/S2, 19 Nov):
 * `/settings` itself is the full-width v6 card grid. The admin sub-pages (`/files`, `/ta`, `/holidays`,
 * `/import`, `/ai`, `/health`, `/templates`, `/baseline`) sit on the canvas like every v6 page, with a way
 * back and pill tabs so every operational screen stays reachable. The window scrolls, no sheet.
 */
export default function SettingsAreaLayout({ children }: { children: React.ReactNode }) {
  const path = usePathname() ?? "/settings";
  if (path === "/settings") {
    return <div className="w-full">{children}</div>;
  }
  return (
    <div className="flex flex-col gap-[22px]">
      <div className="flex flex-col gap-3">
        <Link href="/settings" className="t-small text-ink-3 hover:text-ink">
          ← Back to Settings
        </Link>
        <SettingsNav />
      </div>
      {children}
    </div>
  );
}
