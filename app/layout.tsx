import { Suspense } from "react";

import Keys from "@/app/Keys";
import Toast from "@/app/Toast";
import type { Metadata } from "next";
import { Poppins } from "next/font/google";

import PhoneNav from "@/app/PhoneNav";
import TopBar from "@/app/TopBar";
import { cookies } from "next/headers";

import Chat from "@/app/Chat";
import { CHAT_COOKIE, chatLines, chatOpen as chatShown, chatsOf } from "@/data/chats";
import { desk, openTasksFor, pinsOf } from "@/data/desk";
import { nextSteps } from "@/lib/agent";
import { bellOf } from "@/lib/bell";
import { workByPage } from "@/lib/sectionWork";
import { currentMember } from "@/lib/session";
import { ROLE_LABEL, can } from "@/lib/roles";
import "./globals.css";

// The face: Poppins, the approved Figma design's type (13 Nov; Inter before).
// Light for the greeting, Regular and Medium for everything else. Next serves
// it from this app, so nothing is fetched from Google by the person's browser.
const sans = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-poppins",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Career 141 Ops",
  description: "The client side of Career 141.",
  robots: { index: false, follow: false },
};

/**
 * The shell (24, sections 3, 12 and 13).
 *
 * A top bar over the page, and nothing else over the top of anything: no
 * modals, no drawers (the owner's rule, 2 Nov).
 *
 * The shell has gone top bar → sidebar (5 Nov, the owner's ATS screens) →
 * top bar again (13 Nov, the approved Figma design). The 5 Nov worry was
 * twenty-six pages across a screen; the design answers it with seven
 * workspaces across and the rest behind the profile, every page still under
 * one entry (src/lib/nav.ts). The bar hides once the page is scrolled and
 * comes back for the pointer at the top - the one overlay the owner allowed.
 *
 * What a person may see is worked out here, where the session is, and handed
 * to the bars - which know which page you are on and nothing else.
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
  // AURA's column (the desk assistant, named AURA 13 Nov), open or shut (8 Nov, docs/31). A cookie, so
  // the page is rendered with it already there rather than appearing after.
  const jar = await cookies();
  const chatOpen = jar.get("ops_chat_open")?.value === "1";
  const thread = member && db ? chatShown(db, member.id, jar.get(CHAT_COOKIE)?.value) : null;

  return (
    // suppressHydrationWarning: a browser extension writes its own style onto
    // <html> before React loads, and React then reports a mismatch that is not
    // ours (10 Nov, seen on the lead's review link). One level only.
    <html lang="en" className={sans.variable} suppressHydrationWarning>
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
        {/* J/K, A, Enter and / (UX order 8). One listener; the pages mark their rows. */}
        <Keys />
        {member ? (
          <>
          <TopBar may={may} counts={counts} bell={bell} clients={clients} chatOpen={chatOpen} who={{ name: member.name, role: ROLE_LABEL[member.role] }} />
          <PhoneNav may={may} counts={counts} bell={bell} clients={clients} who={{ name: member.name, role: ROLE_LABEL[member.role] }} />
          <div className="flex min-h-screen flex-col md:flex-row md:items-stretch">
            {/* Padding at the foot on a phone, so the bottom bar never covers the last row. */}
            <main className="min-w-0 flex-1 px-4 py-4 pb-20 md:px-6 md:py-6">{children}</main>
            {/* The third column: the chat, when it is open. It pushes the page
                over; it never floats over it (the owner's rule). On a phone it is
                its own page from the bottom bar. */}
            {chatOpen && db && (
              <aside className="sticky top-0 z-[1] hidden h-screen w-[384px] shrink-0 flex-col self-start border-l border-shell-rule bg-gradient-to-b from-shell to-shell-sunk shadow-[-18px_0_40px_-28px_rgba(22,24,26,0.38)] lg:flex">
                <div className="flex items-baseline justify-between border-b border-shell-rule px-4 py-3">
                  <p className="text-[14px] font-semibold tracking-[-0.01em]">AURA</p>
                  <p className="text-[11px] text-ink-faint">nothing runs without your button</p>
                </div>
                <Chat rows={chatLines(db, member.id, thread)} chats={chatsOf(db, member.id)} open={thread} who={member.name} pins={pinsOf(db, member.id, now)} next={nextSteps(db, member, now)} />
              </aside>
            )}
          </div>
          </>
        ) : (
          <main className="mx-auto max-w-[760px] px-5 py-10">{children}</main>
        )}
      </body>
    </html>
  );
}
