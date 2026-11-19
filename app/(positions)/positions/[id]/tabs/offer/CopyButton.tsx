"use client";

import { useState } from "react";

/** Copies a drafted message to the clipboard. Nothing is sent: a person pastes it where they choose. */
export default function CopyButton({ text, label, className }: { text: string; label: string; className: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className={className}
      onClick={() => {
        navigator.clipboard?.writeText(text).then(() => setDone(true)).catch(() => setDone(false));
      }}
    >
      {done ? "Copied" : label}
    </button>
  );
}
