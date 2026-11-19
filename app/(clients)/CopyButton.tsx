"use client";

import { useState } from "react";

import Icon from "@/app/Icon";

/**
 * "Copy chase 3": puts the drafted words on the clipboard so a person can paste them into WhatsApp or
 * their mail. It sends nothing - the real send stays the approve-and-send road.
 */
export default function CopyButton({ text, label, className, tone = "link" }: { text: string; label: string; className?: string; tone?: "link" | "pill" }) {
  const [done, setDone] = useState(false);
  const base =
    tone === "pill"
      ? "t-label inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-rule bg-surface px-3 py-[7px] text-ink hover:bg-sunk"
      : "t-label inline-flex cursor-pointer items-center text-brand hover:underline";
  return (
    <button
      type="button"
      className={className ?? base}
      onClick={async (e) => {
        e.preventDefault();
        e.stopPropagation();
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          setTimeout(() => setDone(false), 2000);
        } catch {
          setDone(false);
        }
      }}
    >
      {tone === "pill" && <Icon name="copy" size={14} />}
      {done ? "Copied" : label}
      {tone === "link" && !className && !done && " →"}
    </button>
  );
}
