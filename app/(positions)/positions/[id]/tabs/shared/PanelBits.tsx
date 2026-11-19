import Link from "next/link";
import type { ReactNode } from "react";

import Icon from "@/app/Icon";
import { Avatar } from "@/app/ui/figma";

/** "Why now": short amber-dotted lines saying what makes this panel timely. */
export function WhyNow({ lines }: { lines: string[] }) {
  return (
    <ul className="flex flex-col gap-2">
      {lines.map((l) => (
        <li key={l} className="t-body flex items-start gap-3 text-ink-2">
          <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-warn" />
          {l}
        </li>
      ))}
    </ul>
  );
}

/** The client person to reach, with Call and Email links (a phone or an address is only a link when it exists). */
export function ContactBlock({
  contact,
  clientName,
  extra,
}: {
  contact: { name: string; email: string; phone: string; role: string } | null;
  clientName: string;
  extra?: ReactNode;
}) {
  if (!contact) return <p className="t-body text-ink-3">No contact is recorded for this client yet. Add one on the client page.</p>;
  const btn = "inline-flex items-center gap-1.5 rounded-full border border-rule bg-surface px-3.5 py-2 text-[13px] font-medium leading-5 text-ink hover:bg-sunk";
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <Avatar name={contact.name} size="36" tone="neutral" />
        <div className="flex flex-col">
          <span className="t-body-m">{contact.name}</span>
          <span className="t-small text-ink-3">{[contact.role, clientName, contact.phone].filter(Boolean).join(" · ")}</span>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {contact.phone && (
          <Link href={"tel:" + contact.phone.replace(/\s+/g, "")} className={btn}>
            <Icon name="phone" size={14} />
            Call
          </Link>
        )}
        {contact.email && (
          <Link href={"mailto:" + contact.email} className={btn}>
            <Icon name="mail" size={14} />
            Email
          </Link>
        )}
        {extra}
      </div>
    </div>
  );
}

/** A drafted message to read and copy. Nothing here sends: it is the words, in a box. */
export function DraftBox({ label, text }: { label: string; text: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="t-small text-ink-3">{label}</span>
      <p className="t-body whitespace-pre-wrap rounded-[10px] border border-rule bg-surface px-3.5 py-3 text-ink">{text}</p>
    </div>
  );
}

/** The small "not connected yet" line that stands in for a control with nothing behind it. */
export function NotConnected({ what }: { what: string }) {
  return <p className="t-small rounded-[10px] bg-sunk px-3.5 py-2.5 text-ink-3">not connected yet: {what}</p>;
}

export const saveBtn =
  "inline-flex items-center justify-center rounded-full bg-ink px-5 py-[11px] text-[14px] font-medium leading-[21px] text-ink-inverse cursor-pointer disabled:cursor-not-allowed disabled:opacity-40";
