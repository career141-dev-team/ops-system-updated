"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import SettingsNav from "@/app/(settings)/SettingsNav";
import { PageBox } from "@/app/ui/figma";

/**
 * Settings area layout (v6 S1/S2, 19 Nov):
 * On `/settings` itself, render the full-width v6 card grid without the pre-v6 left sidebar.
 * On admin sub-pages (`/files`, `/ta`, `/holidays`, `/import`, `/ai`, `/health`, `/templates`, `/baseline`),
 * keep the SettingsNav rail so every operational screen remains cleanly reachable.
 */
export default function SettingsAreaLayout({ children }: { children: React.ReactNode }) {
  const path = usePathname() ?? "/settings";
  if (path === "/settings") {
    return <div className="w-full">{children}</div>;
  }
  return (
    <PageBox width="full" className="md:flex-1">
      <div className="mb-4">
        <Link href="/settings" className="t-label text-ink-3 hover:text-ink">
          ← Back to Settings
        </Link>
      </div>
      <div className="flex flex-col gap-6 md:min-h-full md:flex-row md:items-stretch md:gap-0">
        <SettingsNav />
        <div className="min-w-0 flex-1 md:pl-12">{children}</div>
      </div>
    </PageBox>
  );
}
