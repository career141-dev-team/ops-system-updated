"use client";

import { useState } from "react";

import Icon from "@/app/Icon";

/** Copies a draft to the clipboard. Nothing is sent: the team pastes it into their own app. */
export default function CopyButton({ text, label }: { text: string; label: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard?.writeText(text).then(() => {
          setDone(true);
          setTimeout(() => setDone(false), 2000);
        });
      }}
      className="t-label inline-flex items-center gap-1.5 rounded-full border border-rule bg-surface px-3 py-[7px] text-ink hover:bg-sunk"
    >
      <Icon name={done ? "check" : "copy"} size={14} />
      {done ? "Copied" : label}
    </button>
  );
}
