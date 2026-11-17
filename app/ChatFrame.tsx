"use client";

import { useRef } from "react";

import { toggleChat } from "@/app/actions";
import Icon from "@/app/Icon";
import { CHAT_WIDTH } from "@/lib/chatWidth";


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

/**
 * The edge you drag to make the AURA column wider or narrower (17 Nov, the owner).
 *
 * The width lives in one CSS variable, `--chat-w`, on the body. The column is that wide and the heading tab leaves
 * that much room on its right, so the tab stays centred over the page whatever the width. It is kept in a cookie so
 * the server draws the same width on the next page and nothing jumps. Double-click, or Home, goes back to the start;
 * the arrow keys move it in sixteens.
 */
export function ChatResize() {
  const edge = useRef<HTMLDivElement>(null);

  // The page is drawn at 90%, so pointer movement in the browser's pixels is not the same as the column's own.
  const scale = () => {
    const column = edge.current?.parentElement;
    return column && column.offsetWidth ? column.getBoundingClientRect().width / column.offsetWidth : 1;
  };
  const current = () => edge.current?.parentElement?.offsetWidth ?? CHAT_WIDTH.start;
  const limit = (width: number) => Math.round(Math.min(Math.max(width, CHAT_WIDTH.min), Math.min(CHAT_WIDTH.max, (window.innerWidth / scale()) * 0.6)));
  const apply = (width: number) => document.body.style.setProperty("--chat-w", limit(width) + "px");
  const keep = () => {
    document.cookie = `${CHAT_WIDTH.cookie}=${current()}; path=/; max-age=${365 * 24 * 60 * 60}; samesite=lax`;
  };

  return (
    <div
      ref={edge}
      role="separator"
      aria-orientation="vertical"
      aria-label="Drag to change how wide AURA is"
      aria-valuemin={CHAT_WIDTH.min}
      aria-valuemax={CHAT_WIDTH.max}
      aria-valuenow={CHAT_WIDTH.start}
      tabIndex={0}
      title="Drag to change the width · double-click to reset"
      onPointerDown={(e) => {
        e.preventDefault();
        const startX = e.clientX;
        const startWidth = current();
        const k = scale();
        const move = (m: PointerEvent) => apply(startWidth + (startX - m.clientX) / k);
        const stop = () => {
          window.removeEventListener("pointermove", move);
          window.removeEventListener("pointerup", stop);
          document.body.style.userSelect = "";
          keep();
        };
        document.body.style.userSelect = "none";
        window.addEventListener("pointermove", move);
        window.addEventListener("pointerup", stop);
      }}
      onDoubleClick={() => {
        apply(CHAT_WIDTH.start);
        keep();
      }}
      onKeyDown={(e) => {
        const step = e.key === "ArrowLeft" ? 16 : e.key === "ArrowRight" ? -16 : 0;
        if (e.key === "Home") apply(CHAT_WIDTH.start);
        else if (step) apply(current() + step);
        else return;
        e.preventDefault();
        keep();
      }}
      className="group absolute inset-y-0 -left-1.5 z-10 flex w-3 cursor-col-resize touch-none items-center justify-center"
    >
      <span className="h-10 w-[3px] rounded-full bg-rule-strong opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100" />
    </div>
  );
}
