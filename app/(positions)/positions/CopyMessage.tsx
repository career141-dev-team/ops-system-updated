"use client";

import { useState } from "react";

import Icon from "@/app/Icon";

/** Copies the message beside it. Nothing is sent: the person pastes it into WhatsApp themselves. */
export default function CopyMessage({ text }: { text: string }) {
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
          () => {},
        );
      }}
      className="t-label inline-flex items-center gap-2 self-start rounded-full border border-rule bg-surface px-4 py-2 hover:bg-sunk"
    >
      <Icon name={done ? "check" : "copy"} size={14} />
      {done ? "Copied" : "Copy message"}
    </button>
  );
}
