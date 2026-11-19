"use client";

import { useState } from "react";

import Icon from "@/app/Icon";

/** "Copy the message": puts a draft on the clipboard. Nothing is sent from here. */
export default function CopyButton({ text, label }: { text: string; label: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          setTimeout(() => setDone(false), 2000);
        } catch {
          setDone(false);
        }
      }}
      className="inline-flex items-center gap-1.5 rounded-full border border-rule bg-surface px-3.5 py-2 text-[13px] font-medium leading-5 text-ink hover:bg-sunk"
    >
      <Icon name={done ? "check" : "copy"} size={14} />
      {done ? "Copied" : label}
    </button>
  );
}
