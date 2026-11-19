import Link from "next/link";
import type { ReactNode } from "react";

import Icon from "@/app/Icon";
import { Card } from "@/app/ui/figma";
import type { Tone, WorkButton, WorkRow } from "@/lib/myWorkView";

/** The numbers strip under the tabs (W1 128:47): equal columns split by hairlines. */
export function StatStrip({ stats }: { stats: { label: string; value: ReactNode; caption: string; tone?: "danger" | "warn" | "info" | "ink" | "ok" }[] }) {
  const tone = { danger: "text-danger", warn: "text-warn", info: "text-info", ink: "text-ink", ok: "text-success" };
  return (
    <section className="flex items-center rounded-[28px] bg-surface px-7 py-[22px] shadow-card max-md:flex-col max-md:items-stretch max-md:gap-5">
      {stats.map((s, i) => (
        <div key={s.label} className="flex min-w-0 flex-1 items-center gap-7">
          {i > 0 && <span aria-hidden="true" className="h-16 w-px shrink-0 bg-rule max-md:hidden" />}
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <p className="t-micro text-ink-3">{s.label}</p>
            <p className={"t-num " + tone[s.tone ?? "ink"]}>{s.value}</p>
            <p className="t-small text-ink-3">{s.caption}</p>
          </div>
        </div>
      ))}
    </section>
  );
}

/** The dark "Where it stands" card (W1 128:143). `action` is the one white pill. */
export function StandsCard({ line, sub, action }: { line: string; sub: string; action?: WorkButton | null }) {
  return (
    <section className="flex flex-col gap-3 rounded-[28px] bg-ink p-6 text-ink-inverse">
      <p className="t-micro flex items-center gap-2 text-ink-3">
        <Icon name="sparkle" size={16} />
        Where it stands
      </p>
      <p className="t-h2">{line}</p>
      <p className="t-small text-ink-3">{sub}</p>
      {action && (
        <div>
          <Link href={action.href} scroll={false} className="inline-flex rounded-full bg-surface px-3.5 py-2 text-[12px] font-medium leading-4 text-ink">
            {action.label}
          </Link>
        </div>
      )}
    </section>
  );
}

/** A white rail card with a small capital title. */
export function RailCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3 rounded-[28px] bg-surface px-6 py-[22px] shadow-card">
      <p className="t-micro text-ink-3">{title}</p>
      {children}
    </section>
  );
}

const TONE_TEXT: Record<Tone, string> = { danger: "text-danger", warn: "text-warn", info: "text-info", ink: "text-ink-3" };
const TONE_DOT: Record<Tone, string> = { danger: "bg-danger", warn: "bg-warn", info: "bg-info", ink: "bg-ink-3" };
export { TONE_DOT, TONE_TEXT };

/** One grey row of a list (Do first, To call): a tag, two lines, one button. */
export function AttentionRow({ row, children }: { row: WorkRow; children?: ReactNode }) {
  const b = row.button;
  return (
    <div className="flex items-center gap-[18px] rounded-[18px] bg-sunk px-5 py-4 max-md:flex-wrap">
      <p className={"t-label flex w-[150px] shrink-0 items-center gap-2 " + TONE_TEXT[row.tone]}>
        <span aria-hidden="true" className={"size-2 rounded-full " + TONE_DOT[row.tone]} />
        {row.tag}
      </p>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="t-body-m truncate">{row.title}</p>
        <p className="t-small truncate text-ink-2">{row.line}</p>
      </div>
      {children}
      {b && (
        <Link
          href={b.href}
          scroll={false}
          className={
            "shrink-0 whitespace-nowrap rounded-full px-3 py-[7px] text-[12px] font-medium leading-4 " +
            (b.primary ? "bg-ink text-ink-inverse" : "border border-rule bg-surface text-ink hover:bg-sunk")
          }
        >
          {b.label}
        </Link>
      )}
    </div>
  );
}

/** A timeline slot of "Today by time" (W1 128:155). */
export function Slot({ time, title, sub }: { time: string; title: string; sub: string }) {
  return (
    <div className="flex gap-3 rounded-[12px] bg-info-soft px-3 py-2.5">
      <span aria-hidden="true" className="w-[3px] shrink-0 self-stretch rounded-[2px] bg-info" />
      <p className="t-small w-[72px] shrink-0 text-info">{time}</p>
      <div className="flex min-w-0 flex-1 flex-col">
        <p className="t-body-m">{title}</p>
        {sub && <p className="t-small text-ink-3">{sub}</p>}
      </div>
    </div>
  );
}

export { Card };
