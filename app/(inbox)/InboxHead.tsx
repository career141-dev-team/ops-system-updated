import Link from "next/link";
import type { ReactNode } from "react";

/**
 * The top of Inbox and Call (17 Nov, Figma 395:11299 and 396:11347): the title and a line under it, the one main
 * button on the right, then the two tabs and how many there are. Both pages draw it, so they never drift apart.
 */
export default function InboxHead({
  title,
  action,
  on,
  count,
}: {
  title: string;
  action?: ReactNode;
  on: "mail" | "calls";
  count: string;
}) {
  const tab = (key: "mail" | "calls", label: string, href: string) => (
    <Link
      href={href}
      aria-current={on === key ? "page" : undefined}
      className={
        "rounded-[14px] border px-6 py-2 text-[14px] leading-[21px] transition-colors " +
        (on === key ? "border-transparent bg-brand-tint font-medium text-brand" : "border-rule text-ink-soft hover:text-ink")
      }
    >
      {label}
    </Link>
  );
  return (
    <div className="flex flex-col">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-rule pb-5">
        <div className="flex flex-col gap-1">
          <h1 className="text-[26px] font-medium leading-[34px] text-ink">{title}</h1>
          <p className="text-[14px] leading-[21px] text-ink-soft">Manage client and candidate emails and call activity in one place.</p>
        </div>
        {action}
      </div>
      <div className="flex flex-wrap items-center gap-3 border-b border-rule py-3.5">
        {tab("mail", "Conversation", "/mail")}
        {tab("calls", "Call", "/calls")}
        <span className="flex-1" />
        <span className="text-[14px] leading-[21px] text-ink-soft">{count}</span>
      </div>
    </div>
  );
}

/** The left column's section names, and its rows: the same on both pages. */
export const sideCaption = "px-3 text-[11px] font-medium uppercase leading-4 tracking-[0.08em] text-ink-faint";

export function SideRow({ href, label, count, on }: { href: string; label: string; count?: number; on: boolean }) {
  return (
    <Link
      href={href}
      aria-current={on ? "page" : undefined}
      className={"flex items-center justify-between rounded-[12px] px-3 py-2.5 text-[14px] leading-[21px] transition-colors " + (on ? "bg-brand-tint font-medium text-brand" : "text-ink hover:bg-sunk")}
    >
      {label}
      {typeof count === "number" && count > 0 && <span className={on ? "text-brand" : "text-ink-faint"}>{count}</span>}
    </Link>
  );
}

export function Chip({ href, label, on }: { href: string; label: string; on: boolean }) {
  return (
    <Link
      href={href}
      aria-current={on ? "page" : undefined}
      className={"rounded-[10px] px-3.5 py-1.5 text-[12px] font-medium leading-4 transition-colors " + (on ? "bg-brand text-ink-inverse" : "bg-brand-tint text-brand hover:bg-brand-soft")}
    >
      {label}
    </Link>
  );
}

/** The three panes' frame: a hairline and a soft corner, as the frames draw them. */
export const pane = "flex min-h-0 flex-col rounded-[20px] border border-rule bg-surface";
