"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";

import { chatDo, chatSay } from "@/app/actions";
import type { OpsChatRow } from "@/data/types";

/**
 * The desk assistant's thread (8 Nov, docs/31).
 *
 * The shape is the one the owner sent on 8 November (an onboarding agent
 * he found): the assistant speaks under a small label with no bubble; the
 * person's words sit in a dark pill on the right with "Sent"; every choice
 * is an inline button; before anything runs the assistant shows "Here is
 * what I will do" as label and value rows and asks "Does this look right?"
 * with two buttons; a working line while it runs; a result card after.
 * The desk's state is pinned at the top so you know where you stand
 * without leaving the thread.
 *
 * It holds no state of its own - every line is a row the server wrote, and
 * every button is a form that runs the action the row names through the
 * same gate the screen uses. "Thinking…" and "Working…" are the forms'
 * own pending state. No overlay, no drawer.
 */
export default function Chat({
  rows,
  who,
  pins,
}: {
  rows: OpsChatRow[];
  who: string;
  pins: { label: string; value: string; late?: boolean }[];
}) {
  const path = usePathname() ?? "/";
  const end = useRef<HTMLDivElement>(null);
  const box = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    end.current?.scrollIntoView({ block: "end" });
  }, [rows.length]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Pinned: where you stand, in four chips. */}
      <div className="flex flex-wrap items-center gap-1.5 border-b border-shell-rule px-3 py-2">
        <span className="mr-1 text-[10px] uppercase tracking-[0.08em] text-ink-faint">Your desk</span>
        {pins.map((pin) => (
          <span
            key={pin.label}
            className={
              "rounded-full border px-2 py-0.5 text-[11px] " +
              (pin.late ? "border-danger/30 bg-bg-danger text-danger" : "border-shell-rule bg-surface text-ink-soft")
            }
          >
            {pin.label} <span className="font-medium text-ink">{pin.value}</span>
          </span>
        ))}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
        {rows.length === 0 && (
          <Said>
            Say what you want done. For example: &ldquo;approve the last email&rdquo;, &ldquo;note: Nippon want the set by
            Friday&rdquo;, &ldquo;record 450,000 against C141-2026-0001&rdquo; - or ask a question.
          </Said>
        )}
        {rows.map((row) => (
          <Line key={row.id} row={row} back={path} onEdit={() => box.current?.focus()} />
        ))}
        <div ref={end} />
      </div>

      <form action={chatSay} className="border-t border-shell-rule bg-surface px-3 py-2">
        <input type="hidden" name="back" value={path} />
        <Box who={who} boxRef={box} />
      </form>
    </div>
  );
}

/** The assistant's voice: a small label, then plain words. No bubble. */
function Said({ children, tone = "" }: { children: React.ReactNode; tone?: string }) {
  return (
    <div className="mb-3 pr-6">
      <p className="text-[10px] uppercase tracking-[0.08em] text-ink-faint">Desk assistant</p>
      <div className={"mt-0.5 text-[13px] leading-relaxed " + tone}>{children}</div>
    </div>
  );
}

function Line({ row, back, onEdit }: { row: OpsChatRow; back: string; onEdit: () => void }) {
  if (row.who === "person") {
    return (
      <div className="mb-3 flex flex-col items-end">
        <div className="max-w-[88%] rounded-2xl rounded-br-md bg-ink px-3.5 py-2 text-[13px] leading-relaxed text-white">
          <p className="whitespace-pre-wrap">{row.text}</p>
        </div>
        <p className="mt-0.5 text-[10.5px] text-ink-faint">Sent ✓</p>
      </div>
    );
  }

  const [first, ...rest] = row.text.split("\n\n");
  const result = rest.join("\n\n");
  const button = row.buttons[0];

  return (
    <Said tone={row.state === "refused" ? "text-danger" : ""}>
      <p className="whitespace-pre-wrap">{first}</p>

      {button && (row.state === "proposed" || row.state === "running" || row.state === "done" || row.state === "refused") && (
        <div className="mt-2 rounded-xl border border-shell-rule bg-surface px-3 py-2">
          <p className="text-[11px] text-ink-faint">Here is what I will do</p>
          <dl className="mt-1 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[12.5px]">
            {button.shows.map((s, i) => (
              <div key={i} className="contents">
                <dt className="text-ink-faint">{s.label}</dt>
                <dd className="text-ink">{s.value}</dd>
              </div>
            ))}
          </dl>
          {row.state === "proposed" && (
            <>
              <p className="mt-2 text-[12.5px]">Does this look right?</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {row.buttons.map((b, i) => (
                  <form key={i} action={chatDo}>
                    <input type="hidden" name="rowId" value={row.id} />
                    <input type="hidden" name="button" value={String(i)} />
                    <input type="hidden" name="back" value={back} />
                    <Press label={b.label} />
                  </form>
                ))}
                <button
                  type="button"
                  onClick={onEdit}
                  className="rounded-full border border-rule-strong bg-surface px-3 py-1.5 text-[12.5px] text-ink-soft hover:bg-paper"
                >
                  Make an edit
                </button>
              </div>
            </>
          )}
          {row.state === "running" && <p className="mt-2 text-[12px] text-ink-soft">Working… through the same gate as the screen.</p>}
        </div>
      )}

      {result && (
        <div
          className={
            "mt-2 rounded-xl border px-3 py-2 text-[12.5px] " +
            (row.state === "refused" ? "border-danger/30 bg-bg-danger text-danger" : "border-brand/30 bg-bg-brand text-ink")
          }
        >
          <p className="text-[10.5px] uppercase tracking-[0.08em] opacity-70">{row.state === "refused" ? "Not done" : "Done"}</p>
          <p className="mt-0.5 whitespace-pre-wrap">{result.replace(/^Not done: /, "")}</p>
        </div>
      )}
    </Said>
  );
}

function Press({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      disabled={pending}
      className="rounded-full bg-ink px-3.5 py-1.5 text-[12.5px] font-medium text-white hover:bg-black active:scale-[0.98] disabled:opacity-60"
    >
      {pending ? "Working…" : label + " ✓"}
    </button>
  );
}

function Box({ who, boxRef }: { who: string; boxRef: React.RefObject<HTMLTextAreaElement | null> }) {
  const { pending } = useFormStatus();
  return (
    <div className="flex items-end gap-2">
      <textarea
        ref={boxRef}
        name="text"
        required
        rows={1}
        disabled={pending}
        placeholder={pending ? "Thinking…" : "Message the desk, " + who.split(" ")[0] + "…"}
        aria-label="Say what you want done"
        className="min-h-[38px] w-full resize-none rounded-xl border border-shell-rule bg-paper px-3 py-2 text-[13px] outline-none placeholder:text-ink-faint focus:border-brand"
        onKeyDown={(e) => {
          // Enter sends; Shift+Enter is a new line, as every chat does it.
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            e.currentTarget.form?.requestSubmit();
          }
        }}
      />
      <button
        disabled={pending}
        aria-label="Send"
        className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-xl bg-ink text-white hover:bg-black active:scale-[0.96] disabled:opacity-60"
      >
        {pending ? "…" : "↑"}
      </button>
    </div>
  );
}
