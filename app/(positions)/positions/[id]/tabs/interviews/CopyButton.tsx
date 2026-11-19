"use client";

import { useState } from "react";

import Icon from "@/app/Icon";

/** "Copy the message": puts the text on the clipboard. Nothing is sent by the system. */
export default function CopyButton({ text, label = "Copy the message" }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard?.writeText(text).then(
          () => {
            setDone(true);
            setTimeout(() => setDone(false), 2000);
          },
          () => undefined,
        );
      }}
      className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-rule bg-surface px-3 py-[7px] t-label text-ink hover:bg-sunk"
    >
      <Icon name={done ? "check" : "copy"} size={14} />
      {done ? "Copied" : label}
    </button>
  );
}
