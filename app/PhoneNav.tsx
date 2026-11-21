"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

import Bell from "@/app/Bell";
import Icon, { ICON_FOR } from "@/app/Icon";
import ProfileMenu from "@/app/ProfileMenu";
import QuickAdd from "@/app/QuickAdd";
import type { Bell as BellCount } from "@/lib/bell";
import { NAV, PHONE_ONLY, PHONE_PAGES, isHere } from "@/lib/nav";

/**
 * The phone's navigation (v6 frame PH1, 181:284; first made 8 Nov, UX order 7).
 *
 * Under 768px: a top row with the logo, the bell and the avatar, and a white bar along the
 * foot of the screen with four tabs - My work, Inbox, Search, Add. The avatar opens the card that
 * holds the other pages (Calendar, Clients and the rest), so nothing the desk has is out of reach.
 * Add opens the same list as the + on the desk, upwards.
 *
 * It is a client component only because it needs to know which page you are on.
 */
export default function PhoneNav({
  may,
  bell,
  who,
  chips,
  viewing,
  dark,
  chatOpen,
  clerkEnabled = false,
}: {
  may: Record<string, boolean>;
  /** What is waiting on this person right now, kept live by the bell itself. */
  bell: BellCount;
  who: { name: string; role: string };
  viewing: string | null;
  chips: { role: string; label: string; active: boolean }[];
  dark: boolean;
  chatOpen: boolean;
  clerkEnabled?: boolean;
}) {
  const path = usePathname() ?? "/";
  const tabs = PHONE_PAGES.map((href) => ({ href, what: NAV[0].pages.find((p) => p.href === href)?.what ?? PHONE_ONLY[href]?.what ?? href }));
  const icon = (href: string) => (href === "/find" ? "search" : (ICON_FOR[href] ?? "work"));
  const tab = "flex flex-1 flex-col items-center gap-[3px]";

  return (
    <>
      {/* The top row. */}
      <header className="flex items-center gap-2.5 px-4 pb-1 pt-5 md:hidden">
        <Link href="/" aria-label="My work" className="shrink-0">
          <Image src="/career141-lockup.png" alt="career141 · 20 years" width={178} height={56} className="h-[30px] w-[100px] object-contain" />
        </Link>
        <div className="flex-1" />
        <Bell initial={bell} />
        <ProfileMenu phone may={may} who={who} viewing={viewing} chips={chips} dark={dark} chatOpen={chatOpen} clerkEnabled={clerkEnabled} />
      </header>

      {/* The bar along the foot. */}
      <nav
        aria-label="The phone's pages"
        className="fixed inset-x-4 bottom-4 z-10 flex rounded-[24px] bg-surface px-2 py-2.5 shadow-card md:hidden"
        style={{ marginBottom: "env(safe-area-inset-bottom)" }}
      >
        {tabs.map((one) => {
          const here = isHere(path, one.href);
          return (
            <Link key={one.href} href={one.href} aria-current={here ? "page" : undefined} className={tab + (here ? " text-ink" : " text-ink-3")}>
              <Icon name={icon(one.href)} size={22} />
              <span className="t-micro !normal-case">{one.what}</span>
            </Link>
          );
        })}
        <QuickAdd phone />
      </nav>
    </>
  );
}
