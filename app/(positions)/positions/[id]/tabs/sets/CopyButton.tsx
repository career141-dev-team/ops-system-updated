"use client";

import { useState } from "react";

import Icon from "@/app/Icon";
import { pillSecondary } from "@/app/ui/figma";

/** Copies text to the clipboard. Nothing is sent anywhere: a person pastes it. */
export default function CopyButton({ text, label }: { text: string; label: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className={pillSecondary + " self-start !px-3 !py-[7px] !text-[12px]"}
      onClick={() => {
        navigator.clipboard?.writeText(text).then(() => setDone(true)).catch(() => {});
      }}
    >
      <Icon name="copy" size={14} />
      {done ? "Copied" : label}
    </button>
  );
}
