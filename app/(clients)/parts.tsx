import Link from "next/link";
import type { ReactNode } from "react";

import Icon from "@/app/Icon";
import { PageTitle, pillPrimary, type Tone } from "@/app/ui/figma";
import CopyButton from "./CopyButton";

/**
 * The pieces C1, C2 and C3 share (v6 frames 177:122, 134:2, 136:2): the heading with "Add a client", the
 * three tabs with the find box, the dark "Where it stands" card and the white rail card.
 */

export const TONE_TEXT: Record<string, string> = {
  brand: "text-brand",
  warn: "text-warn",
  danger: "text-danger",
  info: "text-info",
  neutral: "text-ink-3",
  quiet: "text-ink-3",
  ok: "text-brand",
};
export const TONE_DOT: Record<string, string> = {
  brand: "bg-brand",
  warn: "bg-warn",
  danger: "bg-danger",
  info: "bg-info",
  neutral: "bg-ink-3",
  quiet: "bg-ink-3",
  ok: "bg-brand",
};
/** The 40px tile of a company, tinted by its tone. */
export const TILE_TONE: Record<string, string> = {
  brand: "bg-bg-brand text-brand",
  warn: "bg-warn-soft text-warn",
  info: "bg-info-soft text-info",
  neutral: "bg-sunk text-ink-2",
};

export type ClientsTab = "clients" | "enquiries" | "agreements";

export function ClientsHead({
  tab,
  line,
  counts,
  q,
  filter,
  extra,
}: {
  tab: ClientsTab;
  line: string;
  counts: { clients: number; enquiries: number; agreements: number };
  q: string;
  filter?: string;
  extra?: ReactNode;
}) {
  const tabs: { key: ClientsTab; label: string; href: string; n: number }[] = [
    { key: "clients", label: "Clients", href: "/clients", n: counts.clients },
    { key: "enquiries", label: "Enquiries", href: "/leads", n: counts.enquiries },
    { key: "agreements", label: "Agreements", href: "/clients/agreements", n: counts.agreements },
  ];
  const action = tab === "clients" ? "/clients" : tab === "enquiries" ? "/leads" : "/clients/agreements";
  return (
    <>
      <PageTitle
        title="Clients"
        sub={line}
        right={
          <div className="flex items-center gap-3">
            {extra}
            <Link href="/leads/new" className={pillPrimary}>
              <Icon name="plus" size={16} />
              Add a client
            </Link>
          </div>
        }
      />
      <div className="flex flex-wrap items-center gap-4">
        <nav className="flex items-center gap-1.5">
          {tabs.map((t) => (
            <Link
              key={t.key}
              href={t.href}
              aria-current={t.key === tab ? "page" : undefined}
              className={"t-body-m inline-flex items-center gap-2 rounded-full px-[18px] py-2.5 " + (t.key === tab ? "bg-surface text-ink shadow-card" : "text-ink-3 hover:text-ink")}
            >
              {t.label}
              <span className={"t-label " + (t.key === tab ? "text-ink-3" : "")}>{t.n}</span>
            </Link>
          ))}
        </nav>
        <div className="flex-1" />
        <form action={action} className="flex h-10 w-[340px] max-w-full items-center gap-2.5 rounded-full border border-rule bg-surface px-4">
          {filter && <input type="hidden" name="f" value={filter} />}
          <Icon name="search" size={16} className="shrink-0 text-ink-3" />
          <input name="q" defaultValue={q} autoComplete="off" placeholder="Client or contact" aria-label="Client or contact" className="t-body min-w-0 flex-1 bg-transparent outline-none placeholder:text-ink-3" />
        </form>
      </div>
    </>
  );
}

/** The white strip of C2 and C3: each stage and how many are in it, an arrow between. */
export function FlowStrip({ items }: { items: { label: string; n: number; dot?: boolean; href?: string }[] }) {
  return (
    <div className="flex flex-wrap items-center gap-3.5 rounded-[20px] bg-surface px-6 py-4 shadow-card">
      {items.map((it, i) => {
        const inner = (
          <>
            {it.dot && <span aria-hidden="true" className="size-1.5 rounded-[3px] bg-warn" />}
            <span className="t-body text-ink-2">{it.label}</span>
            <span className="t-body-m">{it.n}</span>
          </>
        );
        return (
          <span key={it.label} className="flex items-center gap-3.5">
            {it.href ? (
              <Link href={it.href} className="flex items-center gap-2 hover:underline">
                {inner}
              </Link>
            ) : (
              <span className="flex items-center gap-2">{inner}</span>
            )}
            {i < items.length - 1 && <Icon name="chevron-right" size={14} className="text-ink-3" />}
          </span>
        );
      })}
    </div>
  );
}

/** The dark card of the rail. `copies` are drafts to copy; `links` are plain buttons. */
export function StandsCard({
  head,
  body,
  copies = [],
  links = [],
}: {
  head: string;
  body: string;
  copies?: { label: string; text: string }[];
  links?: { label: string; href: string }[];
}) {
  const buttons = "t-label inline-flex cursor-pointer items-center rounded-full px-3.5 py-2";
  return (
    <section className="flex flex-col gap-3 rounded-[28px] bg-ink p-6">
      <p className="t-micro flex items-center gap-2 text-ink-3">
        <Icon name="sparkle" size={16} />
        WHERE IT STANDS
      </p>
      <p className="t-h2 text-ink-inverse" style={{ lineHeight: "28px" }}>
        {head}
      </p>
      {body && <p className="t-small text-ink-3">{body}</p>}
      {(copies.length > 0 || links.length > 0) && (
        <div className="flex flex-wrap gap-2">
          {copies.map((c, i) => (
            <CopyButton key={c.label} text={c.text} label={c.label} className={buttons + " " + (i === 0 ? "bg-surface text-ink" : "border border-ink-3 text-ink-inverse")} />
          ))}
          {links.map((l, i) => (
            <Link key={l.label} href={l.href} scroll={false} className={buttons + " " + (copies.length + i === 0 ? "bg-surface text-ink" : "border border-ink-3 text-ink-inverse")}>
              {l.label}
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

export function RailCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3 rounded-[28px] bg-surface px-6 py-[22px] shadow-card">
      <p className="t-micro text-ink-3">{title.toUpperCase()}</p>
      {children}
    </section>
  );
}

/** A refusal or an answer coming back from an action (`?msg=`). */
export function Msg({ msg }: { msg?: string | null }) {
  return msg ? <p className="t-body rounded-[16px] bg-surface px-5 py-3 shadow-card">{msg}</p> : null;
}

export const toneOf = (t: Tone | string): string => TONE_TEXT[t] ?? "text-ink-3";

/** A WhatsApp chat link for a Sri Lankan number ("077 123 4567" or "+94 77 ..."), or null. Opens a chat; sends nothing. */
export function waLink(phone: string | null | undefined): string | null {
  const d = (phone ?? "").replace(/\D/g, "");
  if (d.length < 9) return null;
  return "https://wa.me/" + (d.startsWith("94") ? d : d.replace(/^0/, "94"));
}

/** The icon buttons of a client card: ring, chat, mail. A missing way is simply not drawn. */
export function ReachIcons({ phone, email }: { phone?: string; email?: string }) {
  const wa = waLink(phone);
  const cls = "relative z-10 text-ink-3 hover:text-ink";
  return (
    <>
      {phone && (
        <a href={"tel:" + phone.replace(/\s/g, "")} aria-label="Call" className={cls}>
          <Icon name="phone" size={16} />
        </a>
      )}
      {wa && (
        <a href={wa} target="_blank" rel="noreferrer" aria-label="WhatsApp" className={cls}>
          <Icon name="chat" size={16} />
        </a>
      )}
      {email && (
        <a href={"mailto:" + email} aria-label="Email" className={cls}>
          <Icon name="mail" size={16} />
        </a>
      )}
    </>
  );
}
