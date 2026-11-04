import type { Metadata } from "next";
import Link from "next/link";

import Nav from "@/app/Nav";
import { desk, openTasksFor } from "@/data/desk";
import { workByPage } from "@/lib/sectionWork";
import { currentMember } from "@/lib/session";
import { ROLE_LABEL, can } from "@/lib/roles";
import "./globals.css";

export const metadata: Metadata = {
  title: "Career 141 Ops",
  description: "The client side of Career 141.",
  robots: { index: false, follow: false },
};

/**
 * One header, one page per thing. No overlays, no drawers: everything opens as
 * its own page (owner's rule, 2 Nov).
 *
 * The header has two levels and no more: five sections, and under them the
 * pages of the section you are in (23, section 3). What a person may see is
 * worked out here, where the session is, and handed to the navigation - which
 * knows which page you are on and nothing else.
 */
export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const member = await currentMember();
  const may = {
    "money.manage": member ? can(member, "money.manage") : false,
    "settings.manage": member ? can(member, "settings.manage") : false,
    "report.read": member ? can(member, "report.read") : false,
  };

  // The counts beside the sections. They are your own open tasks, placed on
  // the page their link points at, so the header and the day page can never
  // disagree about where the work is (24, section 4).
  const counts = member ? workByPage(openTasksFor(await desk(), member.id), Date.now()) : {};

  return (
    <html lang="en">
      <body className="min-h-screen">
        <header className="border-b border-rule bg-surface">
          <div className="mx-auto flex max-w-[1100px] flex-wrap items-center gap-x-5 gap-y-2 px-5 py-3">
            <Link href="/" className="text-[14px] font-medium">
              Career 141 Ops
            </Link>
            {member && <Nav may={may} counts={counts} />}
            <span className="ml-auto rounded-full bg-bg-warning px-2.5 py-1 text-[11.5px] text-warning">
              Test data only
            </span>
            {member && (
              <span className="text-[12.5px] text-ink-soft">
                {member.name} · {ROLE_LABEL[member.role]}
              </span>
            )}
          </div>
        </header>
        <main className="mx-auto max-w-[1100px] px-5 py-6">{children}</main>
      </body>
    </html>
  );
}
