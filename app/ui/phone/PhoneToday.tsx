import Link from "next/link";

import type { WorkRow } from "@/lib/myWorkView";

const TONE: Record<WorkRow["tone"], { text: string; dot: string }> = {
  danger: { text: "text-danger", dot: "bg-danger" },
  warn: { text: "text-warn", dot: "bg-warn" },
  info: { text: "text-info", dot: "bg-info" },
  ink: { text: "text-ink-3", dot: "bg-ink-3" },
};

/**
 * The phone's Today (frame PH1, 181:284): "Do first", three cards, one button each, then how many more
 * wait. The desktop's stat strip and rails do not fit 390 wide, so page.tsx shows this instead below 768px.
 * A card opens the role it is about (`rowHref`); its button sits above that link, so the two do not nest.
 */
export default function PhoneToday({
  rows,
  roleHref,
  counts,
}: {
  rows: WorkRow[];
  /** Where tapping the card goes: the record behind the row, when it has one. */
  roleHref: (row: WorkRow) => string | null;
  counts: { approve: number; calls: number; tasks: number };
}) {
  const shown = rows.slice(0, 3);
  const more = rows.length - shown.length;
  return (
    <div className="flex flex-col gap-2.5 md:hidden">
      {rows.length === 0 && <p className="t-body rounded-[24px] bg-surface p-4 text-ink-2">Nothing is waiting on you. A new task, a draft or an email will appear here first.</p>}
      {shown.map((r, i) => {
        const to = roleHref(r);
        const b = r.button;
        return (
          <article key={r.key} className="relative flex flex-col items-start gap-1.5 rounded-[24px] bg-surface p-4">
            {to && <Link href={to} aria-label={r.title} className="absolute inset-0 rounded-[24px]" />}
            <p className={"t-small flex items-center gap-1.5 " + TONE[r.tone].text}>
              <span aria-hidden className={"size-1.5 rounded-[3px] " + TONE[r.tone].dot} />
              {r.tag}
            </p>
            <p className="t-body-m">{r.title}</p>
            <p className="t-small text-ink-3">{r.line}</p>
            {b && (
              <Link
                href={b.href}
                scroll={false}
                className={"relative mt-1 rounded-full px-4 py-[9px] text-[15px] font-medium leading-5 " + (i === 0 || b.primary ? "bg-ink text-ink-inverse" : "border border-rule bg-surface text-ink")}
              >
                {b.label}
              </Link>
            )}
          </article>
        );
      })}
      {more > 0 && (
        <Link href="/?view=tasks" className="t-small px-1 text-ink-3 underline">
          {more} more {more === 1 ? "thing waits" : "things wait"} today
        </Link>
      )}
      <p className="t-small flex flex-wrap gap-x-4 px-1 text-ink-3">
        <Link href="/?view=approve" className="underline">To approve {counts.approve}</Link>
        <Link href="/?view=calls" className="underline">Calls {counts.calls}</Link>
        <Link href="/?view=tasks" className="underline">Tasks {counts.tasks}</Link>
      </p>
    </div>
  );
}
