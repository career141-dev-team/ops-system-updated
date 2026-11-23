"use client";

import { useRef } from "react";

import { toggleChat } from "@/app/actions";
import Icon from "@/app/Icon";


/**
 * The small X that shuts the AURA column (17 Nov, the owner).
 *
 * The same action as "Close AURA" in the profile menu. It sends you back to where you are, search and all, so
 * closing the column never moves you off the page you were reading.
 */
export function ChatClose() {
  const back = useRef<HTMLInputElement>(null);
  return (
    <form
      action={toggleChat}
      onSubmit={() => {
        if (back.current) back.current.value = window.location.pathname + window.location.search;
      }}
    >
      <input ref={back} type="hidden" name="back" defaultValue="/" />
      <button
        type="submit"
        aria-label="Close AURA"
        title="Close AURA"
        className="flex size-7 items-center justify-center rounded-full text-ink-faint transition-colors hover:bg-sunk hover:text-ink"
      >
        <Icon name="x" size={14} />
      </button>
    </form>
  );
}
