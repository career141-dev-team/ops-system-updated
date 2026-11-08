import { Suspense } from "react";

import Toast from "@/app/Toast";
import type { Metadata } from "next";

import Sidebar from "@/app/Sidebar";
import { desk, openTasksFor } from "@/data/desk";
import { bellOf } from "@/lib/bell";
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
  const now = Date.now();
  const db = member ? await desk() : null;
  const counts = member && db ? workByPage(openTasksFor(db, member.id), now) : {};
  // The bell's first number comes with the page; the bell keeps it live after.
  const bell = member && db ? bellOf(db, member.id, now) : { waiting: 0, late: 0, inbox: 0 };
  // The clients' names, for the quick-add box to file a call or a note under.
  const clients = db ? db.clients.map((c) => ({ id: c.id, name: c.name })) : [];

  return (
    <html lang="en">
      {/*
        `suppressHydrationWarning` is on the body and nowhere else (6 Nov).
        
        Browser extensions write their own attributes onto `<body>` before
        React hydrates - ColorZilla adds `cz-shortcut-listen`, and password
        managers and translators do the same - so the server HTML and the
        browser's DOM differ on an attribute nothing of ours put there. React
        reports it as a hydration mismatch, which reads like a bug in this
        app and is not one.
        
        It is deliberately only this element. The flag covers an element's own
        attributes and not its children, so every real mismatch inside the app
        is still reported. Our own code sets exactly one thing here, the class
        name, and that cannot drift between the server and the browser.
      */}
      <body className="min-h-screen" suppressHydrationWarning>
        {/* The three-second confirmation. Suspense because it reads the
            address bar, which is not known until the browser has it. */}
        <Suspense fallback={null}>
          <Toast />
        </Suspense>
        {member ? (
          <div className="flex min-h-screen flex-col md:flex-row md:items-stretch">
            <Sidebar may={may} counts={counts} bell={bell} clients={clients} who={{ name: member.name, role: ROLE_LABEL[member.role] }} />
            {/* Padding at the foot on a phone, so the bottom bar never covers the last row. */}
            <main className="min-w-0 flex-1 px-4 py-4 pb-20 md:px-6 md:py-6">{children}</main>
          </div>
        ) : (
          <main className="mx-auto max-w-[760px] px-5 py-10">{children}</main>
        )}
      </body>
    </html>
  );
}
