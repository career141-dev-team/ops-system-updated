import type { Metadata } from "next";

import Sidebar from "@/app/Sidebar";
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
 * The shell (24, sections 3, 12 and 13).
 *
 * A sidebar on the left, the page on the right, and nothing over the top of
 * anything: no overlays, no modals, no drawers (the owner's rule, 2 Nov).
 *
 * It was a top bar until 5 November. Twenty-six pages do not fit across a
 * screen, and the ones that fitted were the ones there was room for rather
 * than the ones somebody needed. The owner showed two screens of an ATS and
 * asked for this shape instead.
 *
 * What a person may see is worked out here, where the session is, and handed
 * to the sidebar - which knows which page you are on and nothing else.
 */
export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const member = await currentMember();
  const may = {
    "money.manage": member ? can(member, "money.manage") : false,
    "settings.manage": member ? can(member, "settings.manage") : false,
    "report.read": member ? can(member, "report.read") : false,
  };

  // The counts beside the pages. They are your own open tasks, placed on the
  // page their link points at, so the sidebar and the day page can never
  // disagree about where the work is (24, section 4).
  const counts = member ? workByPage(openTasksFor(await desk(), member.id), Date.now()) : {};

  return (
    <html lang="en">
      <body className="min-h-screen">
        {member ? (
          <div className="flex min-h-screen items-stretch">
            <Sidebar may={may} counts={counts} who={{ name: member.name, role: ROLE_LABEL[member.role] }} />
            <main className="min-w-0 flex-1 px-6 py-6">{children}</main>
          </div>
        ) : (
          <main className="mx-auto max-w-[760px] px-5 py-10">{children}</main>
        )}
      </body>
    </html>
  );
}
