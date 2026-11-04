import type { Metadata } from "next";
import Link from "next/link";

import { currentMember } from "@/lib/session";
import { ROLE_LABEL } from "@/lib/roles";
import "./globals.css";

export const metadata: Metadata = {
  title: "Career 141 Ops",
  description: "The client side of Career 141.",
  robots: { index: false, follow: false },
};

/**
 * One header, one page per thing. No overlays, no drawers: everything opens as
 * its own page (owner's rule, 2 Nov).
 */
export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const member = await currentMember();

  return (
    <html lang="en">
      <body className="min-h-screen">
        <header className="border-b border-rule bg-surface">
          <div className="mx-auto flex max-w-[1100px] flex-wrap items-center gap-x-5 gap-y-2 px-5 py-3">
            <Link href="/" className="text-[14px] font-medium">
              Career 141 Ops
            </Link>
            <nav className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-ink-soft">
              <Link href="/" className="hover:text-ink">Your day</Link>
              <Link href="/leads" className="hover:text-ink">Leads</Link>
              <Link href="/clients" className="hover:text-ink">Clients</Link>
              <Link href="/positions" className="hover:text-ink">Positions</Link>
              <Link href="/talent-pulse" className="hover:text-ink">Talent Pulse</Link>
              <Link href="/reports" className="hover:text-ink">Report</Link>
              <Link href="/sets" className="hover:text-ink">CV sets</Link>
              <Link href="/holds" className="hover:text-ink">Holds</Link>
              <Link href="/interviews" className="hover:text-ink">Interviews</Link>
              <Link href="/placements" className="hover:text-ink">Placements</Link>
              <Link href="/invoices" className="hover:text-ink">Invoices</Link>
              <Link href="/guarantees" className="hover:text-ink">Guarantees</Link>
              <Link href="/closes" className="hover:text-ink">Closing</Link>
              <Link href="/mail" className="hover:text-ink">Mail</Link>
              <Link href="/templates" className="hover:text-ink">What we send</Link>
              <Link href="/files" className="hover:text-ink">Files</Link>
              <Link href="/calls" className="hover:text-ink">Calls</Link>
              <Link href="/ta" className="hover:text-ink">TA System</Link>
              <Link href="/settings" className="hover:text-ink">Settings</Link>
              <Link href="/health" className="hover:text-ink">Health</Link>
            </nav>
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
