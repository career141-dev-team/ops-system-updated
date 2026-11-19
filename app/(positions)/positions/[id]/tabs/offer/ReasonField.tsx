"use client";

import { useState } from "react";

import { panelInput } from "@/app/ui/figma";

/**
 * Chips and a line of text that make the ONE `reason` the server action reads: the chip (or what was typed),
 * then "(told by X)" when a "who said it" chip is picked. The actions have no field of their own for these.
 */
export default function ReasonField({
  label,
  chips = [],
  who = [],
  whoLabel = "Who said it",
  placeholder,
}: {
  label: string;
  chips?: string[];
  who?: string[];
  whoLabel?: string;
  placeholder: string;
}) {
  const [value, setValue] = useState("");
  const [by, setBy] = useState("");
  const chip = (text: string, on: boolean, click: () => void) => (
    <button
      key={text}
      type="button"
      onClick={click}
      aria-pressed={on}
      className={"rounded-full border px-3.5 py-2 text-[12px] font-medium " + (on ? "border-ink bg-ink text-ink-inverse" : "border-rule bg-surface text-ink")}
    >
      {text}
    </button>
  );
  const composed = value.trim() + (by && value.trim() ? " (told by " + by + ")" : "");
  return (
    <div className="flex flex-col gap-4">
      {who.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="t-small text-ink-3">{whoLabel}</span>
          <div className="flex flex-wrap gap-2">{who.map((w) => chip(w, by === w, () => setBy(by === w ? "" : w)))}</div>
        </div>
      )}
      <div className="flex flex-col gap-2">
        <span className="t-small text-ink-3">{label}</span>
        {chips.length > 0 && <div className="flex flex-wrap gap-2">{chips.map((t) => chip(t, value === t, () => setValue(t)))}</div>}
        <input required value={value} onChange={(e) => setValue(e.target.value)} placeholder={placeholder} className={panelInput} />
        <input type="hidden" name="reason" value={composed} />
      </div>
    </div>
  );
}
