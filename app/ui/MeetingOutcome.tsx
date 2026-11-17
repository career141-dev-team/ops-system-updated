"use client";

import { useSearchParams } from "next/navigation";
import { useState, type ReactNode } from "react";

/**
 * "Did the call happen?" as a choice first (17 Nov): two forms side by side confused
 * people, so the page asks the question and shows only the form for the answer. After a
 * refused save the page comes back with the button's id, which brings the same form back.
 */
export function MeetingOutcome({ meetingId, held, notHeld }: { meetingId: string; held: ReactNode; notHeld: ReactNode }) {
  const at = useSearchParams().get("at") ?? "";
  const [choice, setChoice] = useState<"held" | "not" | null>(
    at === "held-" + meetingId ? "held" : at === "not-held-" + meetingId ? "not" : null,
  );
  const pick = (value: "held" | "not", text: string) => (
    <button
      type="button"
      onClick={() => setChoice(value)}
      aria-pressed={choice === value}
      className={
        "rounded-full px-5 py-2.5 text-[14px] font-medium " +
        (choice === value ? "bg-ink text-ink-inverse" : "bg-surface text-ink hover:bg-rule")
      }
    >
      {text}
    </button>
  );
  return (
    <div className="mt-2 flex flex-col gap-3 border-t border-rule pt-3">
      <span className="text-[12px] font-medium uppercase tracking-[0.04em] text-ink-soft">Did the call happen?</span>
      <div className="flex flex-wrap gap-2.5">
        {pick("held", "Yes, we had the meeting")}
        {pick("not", "No, we did not have it")}
      </div>
      {choice === "held" && held}
      {choice === "not" && notHeld}
    </div>
  );
}
