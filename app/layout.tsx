import { ClerkProvider } from "@clerk/nextjs";
import { Suspense } from "react";

import Keys from "@/app/Keys";
import Toast from "@/app/Toast";
import type { Metadata } from "next";
import { Poppins } from "next/font/google";

import { AddPanel } from "@/app/QuickAdd";
import PhoneNav from "@/app/PhoneNav";
import TopBar from "@/app/TopBar";
import MotionStage from "@/app/ui/MotionStage";
import { cookies } from "next/headers";

import Chat from "@/app/Chat";
import { CHAT_COOKIE, chatLines, chatOpen as chatShown, chatsOf } from "@/data/chats";
import { desk, pinsOf } from "@/data/desk";
import { nextSteps } from "@/lib/agent";
import { bellOf } from "@/lib/bell";
import { clerkSignInConfigured, currentMember, realMember } from "@/lib/session";
import { ROLE_LABEL, can, previewList } from "@/lib/roles";
import { viewAs } from "@/app/actions";
import Welcome from "@/app/Welcome";
import { ChatClose } from "@/app/ChatFrame";
import AuraLauncher from "@/app/AuraLauncher";
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
 * A top bar over the page, and the window scrolls with the page (19 Nov, the v6 design: the
 * frames are canvas with cards on it, no fixed page box and no tab hanging off it).
 *
 * The shell has gone top bar → sidebar (5 Nov, the owner's ATS screens) →
 * top bar again (13 Nov) → the v6 bar of eight (19 Nov), every page still
 * under one entry (src/lib/nav.ts). The bar hides once the page is scrolled and
 * comes back for the pointer at the top. Overlays are allowed in the places the
 * owner named (docs/07, docs/09): the bar's popovers and the profile card, and
 * the 680px state panels a page opens with ?panel=.
 *
 * Scale (19 Nov): the old 90% zoom is gone. The frames are drawn at 1920px at 100%, so the
 * browser at 1920 wide now shows them pixel for pixel.
 *
 * What a person may see is worked out here, where the session is, and handed
 * to the bars - which know which page you are on and nothing else.
 */
export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const member = await currentMember();
  // Who really signed in: the profile card's name, and the roles they may look through (16 Nov).
  const real = member ? await realMember() : null;
  const previewing = member && real && member.role !== real.role;
  const may = {
    "money.manage": member ? can(member, "money.manage") : false,
    "settings.manage": member ? can(member, "settings.manage") : false,
    "report.read": member ? can(member, "report.read") : false,
  };

  const now = Date.now();
  const db = member ? await desk() : null;
  // The bell's first number comes with the page; the bell keeps it live after.
  const bell = member && db ? bellOf(db, member.id, now) : { waiting: 0, late: 0, inbox: 0 };
  // The clients' names, for the quick-add box to file a call or a note under.
  const chips = member && real ? previewList(real.role).map((role) => ({ role, label: ROLE_LABEL[role], active: role === member.role })) : [];
  const clients = db ? db.clients.map((c) => ({ id: c.id, name: c.name, active: c.stage === "active" })) : [];
  // AURA's column (the desk assistant, named AURA 13 Nov), open or shut (8 Nov, docs/31). A cookie, so
  // the page is rendered with it already there rather than appearing after.
  const jar = await cookies();
  const chatOpen = jar.get("ops_chat_open")?.value === "1";
  // Light unless they chose dark: a cookie, so the page is drawn in it from the first byte (16 Nov).
  const dark = jar.get("ops_theme")?.value === "dark";
  const thread = member && db ? chatShown(db, member.id, jar.get(CHAT_COOKIE)?.value) : null;

  const clerkEnabled = clerkSignInConfigured();
  const shell = (
    <>
      {/* The three-second confirmation. Suspense because it reads the
          address bar, which is not known until the browser has it. */}
      <Suspense fallback={null}>
        <Toast />
      </Suspense>
      {/* J/K, A, Enter and / (UX order 8). One listener; the pages mark their rows. */}
      <Keys />
      {/* The welcome after signing in: a class on the body for a second, then gone. */}
      <Welcome />
      {member ? (
        <>
          <Suspense fallback={<div className="hidden h-[96px] md:block" aria-hidden="true" />}>
            <TopBar
              may={may}
              bell={bell}
              chatOpen={chatOpen}
              who={{ name: member.name, role: ROLE_LABEL[(real ?? member).role] }}
              viewing={previewing ? ROLE_LABEL[member.role] : null}
              chips={chips}
              dark={dark}
              clerkEnabled={clerkEnabled}
            />
            <PhoneNav
              may={may}
              bell={bell}
              who={{ name: member.name, role: ROLE_LABEL[(real ?? member).role] }}
              viewing={previewing ? ROLE_LABEL[member.role] : null}
              chips={chips}
              dark={dark}
              chatOpen={chatOpen}
              clerkEnabled={clerkEnabled}
            />
            {/* The three Add panels: ?panel=add-note, add-call, add-enquiry, from any page. */}
            <AddPanel clients={clients} />
          </Suspense>
          <div className="flex flex-col md:flex-row md:items-start">
            {/* Padding at the foot on a phone, so the bottom bar never covers the last row. On the desk the
              page starts 22px under the bar, with the frames' 40px at the sides. */}
            <main data-welcome="page" className="min-w-0 flex-1 px-4 pb-28 pt-3 md:px-10 md:pb-10 md:pt-[22px]">
              <Suspense fallback={children}>
                <MotionStage>{children}</MotionStage>
              </Suspense>
            </main>
            {/* The third column: the chat, when it is open. It pushes the page
                over; it never floats over it (the owner's rule). On a phone it is
                its own page from the bottom bar. */}
            {chatOpen && db && (
              // The same white as the top bar, rounded like the page, and level with it: its top is the page's top and
              // its foot is the page's foot, with the page's own 24px of air to the window's edge (17 Nov, the owner).
              <aside className="sticky top-[118px] z-[1] mr-10 hidden h-[calc(100dvh-142px)] w-[480px] shrink-0 self-start lg:flex">
                <div className="flex min-h-0 w-full flex-col overflow-hidden rounded-sheet bg-surface shadow-card">
                  <div className="flex items-center justify-between gap-3 border-b border-rule px-4 py-3">
                    <p className="text-[14px] font-semibold tracking-[-0.01em]">AURA</p>
                    <ChatClose />
                  </div>
                  <Chat rows={chatLines(db, member.id, thread)} chats={chatsOf(db, member.id)} open={thread} who={member.name} pins={pinsOf(db, member.id, now)} next={nextSteps(db, member, now)} />
                </div>
              </aside>
            )}
          </div>
          {/* AURA's button in the corner, on every page while the column is shut (23 Nov, the owner). */}
          {!chatOpen && <AuraLauncher />}
          {/* Never invisible while previewing (16 Nov): who you are looking as, and the way back. */}
          {previewing && real && (
            <form action={viewAs} className="fixed inset-x-0 bottom-4 z-40 flex justify-center">
              <input type="hidden" name="role" value={real.role} />
              <span className="flex items-center gap-3 rounded-full bg-ink py-1.5 pl-4 pr-1.5 text-[14px] leading-[21px] text-ink-inverse shadow-float">
                Viewing as {ROLE_LABEL[member.role]}
                <button className="rounded-full bg-surface px-3.5 py-1 text-[14px] font-medium text-ink">Back to {ROLE_LABEL[real.role]}</button>
              </span>
            </form>
          )}
        </>
      ) : (
        <main className="mx-auto max-w-[760px] px-5 py-10">{children}</main>
      )}
    </>
  );

  return (
    // suppressHydrationWarning: a browser extension writes its own style onto
    // <html> before React loads, and React then reports a mismatch that is not
    // ours (10 Nov, seen on the lead's review link). One level only.
    <html lang="en" className={sans.variable} data-theme={dark ? "dark" : "light"} suppressHydrationWarning>
      <body className="min-h-screen" suppressHydrationWarning>
        {clerkEnabled ? <ClerkProvider>{shell}</ClerkProvider> : shell}
      </body>
    </html>
  );
}
