"use client";

import Link from "next/link";
import { useRef } from "react";

import AuraMark from "@/app/AuraMark";
import { toggleChat } from "@/app/actions";

/**
 * AURA's round button in the bottom-right corner, on every page while the column is shut (23 Nov, the owner).
 *
 * On the desk it opens the column beside the page you are on (the same action as the profile menu's Open AURA);
 * a phone has no room for a column, so there it goes to AURA's own page, above the bottom bar.
 */
export default function AuraLauncher() {
  const back = useRef<HTMLInputElement>(null);
  const button = "flex size-14 items-center justify-center rounded-full shadow-float transition-transform hover:scale-[1.04] active:scale-[0.96]";
  return (
    <>
      <form
        action={toggleChat}
        onSubmit={() => {
          if (back.current) back.current.value = window.location.pathname + window.location.search;
        }}
        className="fixed bottom-6 right-6 z-40 hidden lg:block"
      >
        <input ref={back} type="hidden" name="back" defaultValue="/" />
        <button aria-label="Open AURA" title="Open AURA" className={button}>
          <AuraMark size={56} />
        </button>
      </form>
      <Link href="/chat" aria-label="Open AURA" title="Open AURA" className={"fixed bottom-24 right-4 z-40 lg:hidden " + button}>
        <AuraMark size={56} />
      </Link>
    </>
  );
}
