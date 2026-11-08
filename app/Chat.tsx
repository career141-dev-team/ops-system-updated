"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";

import { chatDo, chatSay } from "@/app/actions";
import type { OpsChatRow } from "@/data/types";
import { PENDING, yesterdayInWords } from "@/lib/agent";

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
  // Memory of yesterday (part 4): one line, counted from the thread, no model.
  const yesterday = yesterdayInWords(rows, Date.now());
  const path = usePathname() ?? "/";
  const end = useRef<HTMLDivElement>(null);
  const box = useRef<HTMLTextAreaElement>(null);

  // What arrived since the page was rendered (part 2). The server's rows are
  // the truth; these are appended until the next render replaces them. The
  // poll is the bell's: every half minute, and when the tab comes back.
  const [arrived, setArrived] = useState<OpsChatRow[]>([]);
  const all = [...rows, ...arrived.filter((a) => !rows.some((r) => r.id === a.id))];
  useEffect(() => {
    setArrived([]);
  }, [rows]);
  useEffect(() => {
    let stopped = false;
    let after = rows.reduce((m, r) => Math.max(m, r.at), 0);
    const ask = async () => {
      try {
        const res = await fetch("/api/chat?after=" + after, { cache: "no-store" });
        if (!res.ok || stopped) return;
        const got = (await res.json()) as { ok: boolean; rows: OpsChatRow[] };
        if (!got.ok || stopped || !got.rows.length) return;
        after = got.rows.reduce((m, r) => Math.max(m, r.at), after);
        setArrived((have) => [...have, ...got.rows.filter((r) => !have.some((h) => h.id === r.id))]);
      } catch {
        // The network being away is not news.
      }
    };
    const timer = window.setInterval(ask, 30_000);
    const onShow = () => {
      if (document.visibilityState === "visible") void ask();
    };
    document.addEventListener("visibilitychange", onShow);
    void ask();
    return () => {
      stopped = true;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onShow);
    };
  }, [rows]);

  useEffect(() => {
    end.current?.scrollIntoView({ block: "end" });
  }, [all.length]);

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
        {yesterday && <p className="mb-3 rounded-lg bg-shell-sunk px-3 py-1.5 text-[11.5px] text-ink-soft">{yesterday}</p>}
        {all.length === 0 && (
          <Said>
            Say what you want done. For example: &ldquo;approve the last email&rdquo;, &ldquo;note: Nippon want the set by
            Friday&rdquo;, &ldquo;record 450,000 against C141-2026-0001&rdquo; - or ask a question.
          </Said>
        )}
        {all.map((row) => (
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

  if (row.who === "feed") {
    const [said, open] = first.split("\n");
    return (
      <div className="mb-3 pr-6">
        <p className="text-[10px] uppercase tracking-[0.08em] text-ink-faint">Arrived</p>
        <p className="mt-0.5 text-[13px] leading-relaxed text-ink">
          {said}
          {open && (
            <>
              {" "}
              <Link href={open} className="text-brand hover:underline">
                Open
              </Link>
            </>
          )}
        </p>
        {row.state === "proposed" && row.buttons.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {row.buttons.map((b, i) => (
              <form key={i} action={chatDo}>
                <input type="hidden" name="rowId" value={row.id} />
                <input type="hidden" name="button" value={String(i)} />
                <input type="hidden" name="back" value={back} />
                <Press label={b.label} />
              </form>
            ))}
          </div>
        )}
        {row.state === "running" && <p className="mt-1 text-[12px] text-ink-soft">Working…</p>}
        {result && <p className={"mt-1 text-[12px] " + (row.state === "refused" ? "text-danger" : "text-ink-soft")}>{result.replace(/^Not done: /, "Not done: ")}</p>}
      </div>
    );
  }

  const waiting = !!row.actionName && row.actionName.startsWith(PENDING);
  return (
    <Said tone={row.state === "refused" ? "text-danger" : ""}>
      <p className="whitespace-pre-wrap">{first}</p>
      {waiting && <p className="mt-1 text-[11.5px] text-ink-faint">Type the answer below, or &ldquo;never mind&rdquo;.</p>}

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
