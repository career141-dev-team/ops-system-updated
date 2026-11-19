"use client";

import { useState } from "react";

import { ChoicePill, panelInput } from "@/app/ui/figma";

/**
 * A panel's "log it" fields as pills and a note, joined into the one text field an action keeps
 * (`target`: the decline's `reason`, a call's `outcome`). The pills are real radios, so with no script
 * the first is sent as it stands; the joined text is what the server reads.
 */
export default function ReasonPicker({
  target,
  groups,
  noteLabel = "Note",
  notePlaceholder = "",
  noteRequired = false,
}: {
  target: string;
  groups: { label: string; options: string[]; first?: boolean }[];
  noteLabel?: string;
  notePlaceholder?: string;
  noteRequired?: boolean;
}) {
  const [picked, setPicked] = useState<string[]>(groups.map((g) => (g.first === false ? "" : g.options[0])));
  const [note, setNote] = useState("");
  const text = [...picked, note.trim()].filter(Boolean).join(". ");
  return (
    <div className="flex flex-col gap-4">
      <input type="hidden" name={target} value={text} />
      {groups.map((g, gi) => (
        <div key={g.label} className="flex flex-col gap-1.5">
          <span className="t-small text-ink-3">{g.label}</span>
          <div
            role="radiogroup"
            aria-label={g.label}
            className="flex flex-wrap gap-2"
            onChange={(e) => setPicked((p) => p.map((v, i) => (i === gi ? (e.target as HTMLInputElement).value : v)))}
          >
            {g.options.map((o) => (
              <ChoicePill key={o} name={"pick" + gi} value={o} label={o} defaultChecked={picked[gi] === o} />
            ))}
          </div>
        </div>
      ))}
      <div className="flex flex-col gap-1.5">
        <span className="t-small text-ink-3">{noteLabel}</span>
        <input className={panelInput} value={note} required={noteRequired} onChange={(e) => setNote(e.target.value)} placeholder={notePlaceholder} />
      </div>
    </div>
  );
}
