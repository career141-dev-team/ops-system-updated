import Link from "next/link";
import type { ReactNode } from "react";

import Icon from "@/app/Icon";
import { Avatar } from "@/app/ui/figma";
import { PanelSection } from "@/app/ui/Panel";

import CopyButton from "./CopyButton";

const pill = "inline-flex items-center gap-1.5 rounded-full border border-rule bg-surface px-3 py-[7px] t-label text-ink hover:bg-sunk";

/** "Why now": a few plain lines, each from the record, never invented. */
export function WhyNow({ lines }: { lines: string[] }) {
  return (
    <PanelSection title="Why now">
      <ul className="flex flex-col gap-2">
        {lines.map((line) => (
          <li key={line} className="t-body flex items-start gap-2.5 text-ink-2">
            <span className="mt-2 size-1.5 shrink-0 rounded-[3px] bg-warn" />
            {line}
          </li>
        ))}
      </ul>
    </PanelSection>
  );
}

/** One person with Call and WhatsApp as plain links (tel: and wa.me): the person does the sending. */
export function Person({ name, line, phone }: { name: string; line: string; phone?: string }) {
  const digits = (phone ?? "").replace(/[^\d]/g, "");
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <Avatar name={name} size="40" tone="neutral" />
        <div className="flex min-w-0 flex-col">
          <span className="t-body-m">{name}</span>
          <span className="t-small text-ink-3">{line}</span>
        </div>
      </div>
      {digits ? (
        <div className="flex flex-wrap gap-2">
          <a href={"tel:+" + digits.replace(/^0/, "94")} className={pill}>
            <Icon name="phone" size={14} /> Call
          </a>
          <a href={"https://wa.me/" + digits.replace(/^0/, "94")} target="_blank" rel="noreferrer" className={pill}>
            <Icon name="chat" size={14} /> WhatsApp
          </a>
        </div>
      ) : (
        <p className="t-small text-ink-3">No phone number is held here for this person.</p>
      )}
    </div>
  );
}

/** A message to copy: the text in a bordered box and the copy button. */
export function MessageBox({ label, text }: { label: string; text: string }) {
  return (
    <div className="flex flex-col gap-1.5 pt-1">
      <span className="t-small text-ink-3">{label}</span>
      <p className="t-body whitespace-pre-line rounded-[14px] border border-rule px-4 py-3.5 text-ink-2">{text}</p>
      <div>
        <CopyButton text={text} />
      </div>
    </div>
  );
}

/** What happens next, then the buttons. */
export function Next({ children, buttons }: { children: ReactNode; buttons: ReactNode }) {
  return (
    <PanelSection title="What happens next">
      <p className="t-body text-ink-2">{children}</p>
      <div className="flex flex-wrap items-center gap-3">{buttons}</div>
    </PanelSection>
  );
}

/** A panel that cannot say whose interview it is: a short list to choose from, each a link. */
export function Chooser({ items, hrefFor }: { items: { id: string; name: string; line: string }[]; hrefFor: (id: string) => string }) {
  return (
    <PanelSection title="Choose one">
      {items.length === 0 ? (
        <p className="t-body text-ink-3">There is no interview on this role yet. One appears when the client shortlists somebody from a CV set.</p>
      ) : (
        items.map((it) => (
          <Link key={it.id} href={hrefFor(it.id)} scroll={false} className="flex items-center gap-3 rounded-[14px] border border-rule px-4 py-3 hover:bg-sunk">
            <Avatar name={it.name} size="32" tone="neutral" />
            <span className="flex min-w-0 flex-col">
              <span className="t-body-m">{it.name}</span>
              <span className="t-small text-ink-3">{it.line}</span>
            </span>
          </Link>
        ))
      )}
    </PanelSection>
  );
}
