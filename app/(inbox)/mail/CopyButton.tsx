"use client";

import { useState } from "react";

/** Copies a message for pasting into WhatsApp by hand: nothing is sent from here. */
export default function CopyButton({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard?.writeText(text).then(() => {
          setDone(true);
          setTimeout(() => setDone(false), 1500);
        }, () => {});
      }}
      className="inline-flex items-center rounded-full border border-rule bg-surface px-3 py-[7px] t-label text-ink hover:bg-sunk"
    >
      {done ? "Copied" : "Copy"}
    </button>
  );
}
