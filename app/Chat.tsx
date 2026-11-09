"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";

import { chatDo, chatSay } from "@/app/actions";
import type { OpsChatRow } from "@/data/types";
import { PENDING, yesterdayInWords } from "@/lib/agent";

/**
 * The desk assistant's thread (8 Nov, docs/31; polished 9 Nov).
 *
 * The shape is the one the owner sent on 8 November: the assistant speaks
 * under a small label with no bubble; the person's words sit in a dark pill
 * with "Sent"; every choice is an inline button; before anything runs the
 * assistant shows "Here is what I will do" and asks "Does this look right?".
 *
 * On 9 November the owner asked for four things, each here:
 *
 *   - **Premium**: the column sits on a shade above the page, and a plan is
 *     a raised card, so the eye knows which surface is the assistant's.
 *   - **Trustworthy**: every plan shows its steps (read, found, your
 *     button), every row it claims links to the record that proves it, and
 *     every answer and result names what it was made from (the "↗" lines).
 *   - **No jumping**: the moment you send, your words and a reply-sized
 *     placeholder are laid out at once, so when the reply lands it fills a
 *     space that was already there; lines fade in, never slide or grow; the
 *     scrollbar's gutter is reserved; a button keeps its width while working.
 *   - **Proactive**: each line of a plan has a pencil that puts "Change …
 *     to" in the box, so editing is typing one line; and the next actions,
 *     read off the desk, sit above the box as one-tap suggestions.
 *
 * Every line is still a row the server wrote, and every button a form that
 * runs the action the row names through the same gate the screen uses.
 */
export default function Chat({
  rows,
  who,
  pins,
  next,
}: {
  rows: OpsChatRow[];
  who: string;
  pins: { label: string; value: string; late?: boolean }[];
  next: { label: string; say: string }[];
}) {
  const yesterday = yesterdayInWords(rows, Date.now());
  const path = usePathname() ?? "/";
  const end = useRef<HTMLDivElement>(null);
  const box = useRef<HTMLTextAreaElement>(null);
  const form = useRef<HTMLFormElement>(null);

  // What arrived since the page was rendered: appended until the next
  // render replaces them. The poll is the bell's: every half minute, and
  // when the tab comes back.
  const [arrived, setArrived] = useState<OpsChatRow[]>([]);
  // What was just sent, laid out at once with a reply-sized space under it,
  // so the thread does not jump when the server's rows arrive.
  const [sending, setSending] = useState<string | null>(null);
  const all = [...rows, ...arrived.filter((a) => !rows.some((r) => r.id === a.id))];
  useEffect(() => {
    setArrived([]);
    setSending(null);
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
  }, [all.length, sending]);

  /** Put words in the box, caret at the end, ready to finish or send. */
  const prefill = (text: string) => {
    const el = box.current;
    if (!el) return;
    el.value = text;
    el.focus();
    el.setSelectionRange(text.length, text.length);
  };
  /** A suggestion: the words, sent at once. */
  const sendNow = (text: string) => {
    prefill(text);
    form.current?.requestSubmit();
  };

  const last = all[all.length - 1];
  const waitingForAnswer = !!last?.actionName?.startsWith(PENDING);

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

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3 [overflow-anchor:none] [scrollbar-gutter:stable]">
        {yesterday && <p className="mb-3 rounded-lg bg-shell-sunk px-3 py-1.5 text-[11.5px] text-ink-soft">{yesterday}</p>}
        {all.length === 0 && !sending && (
          <Said>
            Say what you want done. For example: &ldquo;approve the last email&rdquo;, &ldquo;note: Nippon want the set by
            Friday&rdquo;, &ldquo;record 450,000 against C141-2026-0001&rdquo; - or ask a question.
          </Said>
        )}
        {all.map((row) => (
          <Line key={row.id} row={row} back={path} onEdit={prefill} />
        ))}
        {sending && (
          <>
            <Mine text={sending} sent={false} />
            <Reserved />
          </>
        )}
        <div ref={end} />
      </div>

      <div className="border-t border-shell-rule bg-surface px-3 pb-2 pt-2">
        {/* What comes next, read off the desk: one tap each. Hidden while the
            desk is waiting for an answer, which comes first. */}
        {!waitingForAnswer && !sending && next.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-1.5" aria-label="Suggested next">
            {next.map((n) => (
              <button
                key={n.say}
                type="button"
                onClick={() => sendNow(n.say)}
                className="rounded-full border border-shell-rule bg-paper px-2.5 py-1 text-[11.5px] text-ink-soft transition-colors hover:border-brand hover:text-ink"
              >
                {n.label} →
              </button>
            ))}
          </div>
        )}
        <form
          ref={form}
          action={chatSay}
          onSubmit={() => {
            const text = box.current?.value.trim();
            if (text) setSending(text);
          }}
        >
          <input type="hidden" name="back" value={path} />
          <Box who={who} boxRef={box} waiting={waitingForAnswer} />
        </form>
      </div>
    </div>
  );
}

/** The assistant's voice: a small label, then plain words. No bubble. */
function Said({ children, tone = "", label = "Desk assistant" }: { children: React.ReactNode; tone?: string; label?: string }) {
  return (
    <div className="chat-in mb-3 pr-6">
      <p className="text-[10px] uppercase tracking-[0.08em] text-ink-faint">{label}</p>
      <div className={"mt-0.5 text-[13px] leading-relaxed " + tone}>{children}</div>
    </div>
  );
}

function Mine({ text, sent = true }: { text: string; sent?: boolean }) {
  return (
    <div className="chat-in mb-3 flex flex-col items-end">
      <div className="max-w-[88%] rounded-2xl rounded-br-md bg-ink px-3.5 py-2 text-[13px] leading-relaxed text-white shadow-[0_1px_2px_rgba(22,24,26,0.12)]">
        <p className="whitespace-pre-wrap">{text}</p>
      </div>
      <p className="mt-0.5 text-[10.5px] text-ink-faint">{sent ? "Sent ✓" : "Sending…"}</p>
    </div>
  );
}

/** The space a reply takes, laid out before it arrives so nothing below or above moves. */
function Reserved() {
  return (
    <div className="mb-3 pr-6" aria-live="polite" aria-busy="true">
      <p className="text-[10px] uppercase tracking-[0.08em] text-ink-faint">Desk assistant · reading what you asked</p>
      <div className="mt-1.5 flex min-h-[84px] flex-col gap-2 rounded-xl border border-shell-rule bg-surface px-3 py-2.5">
        <span className="chat-skeleton h-2.5 w-[72%] rounded-full" />
        <span className="chat-skeleton h-2.5 w-[54%] rounded-full" />
        <span className="chat-skeleton h-2.5 w-[38%] rounded-full" />
      </div>
    </div>
  );
}

/** "↗ label|href" lines are citations: what an answer or a result was made from. */
function splitCites(text: string): { body: string; cites: { label: string; href: string }[] } {
  const cites: { label: string; href: string }[] = [];
  const body = text
    .split("\n")
    .filter((line) => {
      if (!line.startsWith("↗ ")) return true;
      const [label, href = ""] = line.slice(2).split("|");
      cites.push({ label, href });
      return false;
    })
    .join("\n");
  return { body, cites };
}

function Cites({ cites }: { cites: { label: string; href: string }[] }) {
  if (!cites.length) return null;
  return (
    <div className="mt-1.5 flex flex-wrap gap-1">
      {cites.map((c, i) =>
        c.href ? (
          <Link
            key={i}
            href={c.href}
            className="rounded-md border border-shell-rule bg-paper px-1.5 py-0.5 text-[11px] text-ink-soft hover:border-brand hover:text-brand"
          >
            ↗ {c.label}
          </Link>
        ) : (
          <span key={i} className="rounded-md bg-shell-sunk px-1.5 py-0.5 text-[11px] text-ink-faint">
            ↗ {c.label}
          </span>
        ),
      )}
    </div>
  );
}

/** Read · Found · Your button: where a plan stands, so nothing happens out of sight. */
function Steps({ state, found }: { state: string; found: number }) {
  const third =
    state === "proposed" ? { mark: "3", text: "Your button", tone: "text-ink" } :
    state === "running" ? { mark: "…", text: "Working", tone: "text-ink" } :
    state === "refused" ? { mark: "✕", text: "Not done", tone: "text-danger" } :
    state === "said" ? { mark: "–", text: "Replaced by your edit", tone: "text-ink-faint" } :
    { mark: "✓", text: "Done", tone: "text-brand" };
  const dot = "flex h-4 w-4 items-center justify-center rounded-full text-[9.5px] font-medium";
  return (
    <ol className="flex items-center gap-1.5 text-[10.5px] text-ink-faint">
      <li className="flex items-center gap-1"><span className={dot + " bg-bg-brand text-brand"}>✓</span>Read what you asked</li>
      <li aria-hidden="true">·</li>
      <li className="flex items-center gap-1"><span className={dot + " bg-bg-brand text-brand"}>✓</span>Found {found} {found === 1 ? "record" : "records"}</li>
      <li aria-hidden="true">·</li>
      <li className={"flex items-center gap-1 " + third.tone}>
        <span className={dot + " " + (state === "proposed" ? "bg-ink text-white" : state === "refused" ? "bg-bg-danger" : state === "said" ? "bg-shell-sunk" : "bg-bg-brand")}>{third.mark}</span>
        {third.text}
      </li>
    </ol>
  );
}

function Line({ row, back, onEdit }: { row: OpsChatRow; back: string; onEdit: (text: string) => void }) {
  if (row.who === "person") return <Mine text={row.text} />;

  const { body, cites } = splitCites(row.text);
  const [first, ...rest] = body.split("\n\n");
  const result = rest.join("\n\n");
  const button = row.buttons[0];

  if (row.who === "feed") {
    const [said, open] = first.split("\n");
    return (
      <Said label="Arrived">
        <p className="text-ink">
          {said}
          {open && (
            <>
              {" "}
              <Link href={open} className="text-brand hover:underline">↗ Open</Link>
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
        {result && <p className={"mt-1 text-[12px] " + (row.state === "refused" ? "text-danger" : "text-ink-soft")}>{result}</p>}
        <Cites cites={cites} />
      </Said>
    );
  }

  const waiting = !!row.actionName && row.actionName.startsWith(PENDING);
  const found = button ? button.shows.filter((s) => s.href).length : 0;
  return (
    <Said tone={row.state === "refused" && !button ? "text-danger" : ""}>
      <p className="whitespace-pre-wrap">{first}</p>
      {waiting && <p className="mt-1 text-[11.5px] text-ink-faint">Type the answer below, or &ldquo;never mind&rdquo;.</p>}
      {!button && <Cites cites={cites} />}

      {button && (
        <div
          className={
            "mt-2 rounded-xl border border-shell-rule bg-surface px-3 py-2.5 " +
            (row.state === "said"
              ? "opacity-60"
              : "shadow-[0_1px_2px_rgba(22,24,26,0.05),0_10px_24px_-14px_rgba(22,24,26,0.22)]")
          }
        >
          <Steps state={row.state} found={found} />
          <p className="mt-2 text-[11px] text-ink-faint">Here is what I will do</p>
          <dl className="mt-1 grid grid-cols-[auto_1fr_auto] items-baseline gap-x-3 gap-y-1 text-[12.5px]">
            {button.shows.map((s, i) => (
              <div key={i} className="contents">
                <dt className="text-ink-faint">{s.label}</dt>
                <dd className="min-w-0 break-words text-ink">
                  {s.href ? (
                    <Link href={s.href} title="Open the record this comes from" className="decoration-shell-rule underline-offset-2 hover:text-brand hover:underline">
                      {s.value}
                    </Link>
                  ) : (
                    s.value
                  )}
                </dd>
                <dd>
                  {/* One pencil per field: "To" on a draft is part of the draft, not a line of its own. */}
                  {row.state === "proposed" && s.field && button.shows.findIndex((x) => x.field === s.field) === i && (
                    <button
                      type="button"
                      onClick={() => onEdit("Change " + s.label.toLowerCase() + " to ")}
                      title={"Change " + s.label.toLowerCase()}
                      aria-label={"Change " + s.label.toLowerCase()}
                      className="rounded px-1 text-[11px] text-ink-faint hover:bg-shell-sunk hover:text-ink"
                    >
                      ✎
                    </button>
                  )}
                </dd>
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
                  onClick={() => onEdit("Change ")}
                  className="rounded-full border border-rule-strong bg-surface px-3 py-1.5 text-[12.5px] text-ink-soft hover:bg-paper"
                >
                  Make an edit
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {result && (
        <div
          className={
            "chat-in mt-2 rounded-xl border px-3 py-2 text-[12.5px] " +
            (row.state === "refused" ? "border-danger/30 bg-bg-danger text-danger" : "border-brand/30 bg-bg-brand text-ink")
          }
        >
          <p className="text-[10.5px] uppercase tracking-[0.08em] opacity-70">{row.state === "refused" ? "Not done" : "Done"}</p>
          <p className="mt-0.5 whitespace-pre-wrap">{result.replace(/^Not done: /, "")}</p>
          {button && <Cites cites={cites} />}
        </div>
      )}
    </Said>
  );
}

/** Keeps its label and width while working, so the row it sits in never reflows. */
function Press({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      disabled={pending}
      aria-busy={pending}
      className="relative rounded-full bg-ink px-3.5 py-1.5 text-left text-[12.5px] font-medium text-white shadow-[0_1px_2px_rgba(22,24,26,0.2)] hover:bg-black active:scale-[0.98] disabled:opacity-70"
    >
      <span className={pending ? "opacity-40" : ""}>{label} ✓</span>
      {pending && <span className="absolute inset-0 flex items-center justify-center text-[11.5px]">Working…</span>}
    </button>
  );
}

function Box({ who, boxRef, waiting }: { who: string; boxRef: React.RefObject<HTMLTextAreaElement | null>; waiting: boolean }) {
  const { pending } = useFormStatus();
  return (
    <div className="flex items-end gap-2">
      <textarea
        ref={boxRef}
        name="text"
        required
        rows={1}
        readOnly={pending}
        placeholder={waiting ? "Type the answer…" : "Message the desk, " + who.split(" ")[0] + "…"}
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
        ↑
      </button>
    </div>
  );
}
