"use client";

import gsap from "gsap";
import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";

import Icon, { type IconName } from "@/app/Icon";
import PanelOpen from "@/app/ui/PanelOpen";
import { EASE_OUT, prefersReducedMotion } from "@/lib/motion";

export type SendTabKind = "invite" | "email" | "whatsapp" | "pdf";

export interface SendAttachment {
  name: string;
  size?: string;
  href?: string;
}

export interface SendInvitePreview {
  banner: string;
  dateTag: string;
  title: string;
  when: string;
  where: string;
  guests: { initials: string; name: string; tone?: string }[];
  notes?: string;
  attachments?: SendAttachment[];
}

export interface SendEmailPreview {
  from: string;
  to: string;
  subject: string;
  body: string;
  attachments?: SendAttachment[];
  /** Hidden fields merged into the submit form when sending. */
  editable?: boolean;
}

export interface SendWhatsAppPreview {
  recipient: string;
  phone?: string;
  body: string;
  time?: string;
}

export interface SendTab {
  key: string;
  label: string;
  kind: SendTabKind;
  invite?: SendInvitePreview;
  email?: SendEmailPreview;
  whatsapp?: SendWhatsAppPreview;
  /** Optional secondary email preview shown under an invite card (as in R1 Book interview). */
  alsoEmail?: SendEmailPreview;
  /** Optional PDF/document viewer iframe or link. */
  pdf?: { title: string; href: string; note?: string };
}

const TAB_ICON: Record<SendTabKind, IconName> = {
  invite: "calendar",
  email: "mail",
  whatsapp: "chat",
  pdf: "file",
};

/**
 * Shared 1600px Preview-and-Send overlay (v6 `send` frames).
 *
 * Left column: summary & context controls (slot picker, terms, chase history, CVs, invoice summary).
 * Right column: channel tabs, realistic rendered preview, inline Edit mode, and the real server
 * action form that obeys the outbound gate.
 */
export default function PreviewAndSend({
  title,
  sub,
  extra,
  closeHref,
  left,
  tabs,
  action,
  hidden = {},
  sendLabel = "Send",
  disabledReason,
  note,
}: {
  title: string;
  sub?: string;
  /** A smaller grey line under `sub`, such as when the last talk was. */
  extra?: string;
  closeHref: string;
  left: ReactNode;
  tabs: SendTab[];
  action?: (formData: FormData) => void | Promise<void>;
  hidden?: Record<string, string | undefined>;
  sendLabel?: string;
  disabledReason?: string | null;
  /** Short honest note under the footer (e.g. test mode or manual WhatsApp). */
  note?: string;
}) {
  const [activeKey, setActiveKey] = useState(tabs[0]?.key ?? "");
  const [editing, setEditing] = useState(false);
  const [copied, setCopied] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = previewRef.current;
    if (!el || prefersReducedMotion()) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        el,
        { y: 6, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.2, ease: EASE_OUT, clearProps: "transform,opacity" },
      );
    }, el);
    return () => ctx.revert();
  }, [activeKey, editing]);

  const active = tabs.find((t) => t.key === activeKey) ?? tabs[0];
  const primaryEmail = active?.email ?? active?.alsoEmail ?? tabs.find((t) => t.email)?.email;
  const primaryWa = active?.whatsapp ?? tabs.find((t) => t.whatsapp)?.whatsapp;

  const [subject, setSubject] = useState(primaryEmail?.subject ?? "");
  const [body, setBody] = useState(primaryEmail?.body ?? primaryWa?.body ?? "");

  const switchTab = (tab: SendTab) => {
    setActiveKey(tab.key);
    setEditing(false);
    setCopied(false);
    const nextEmail = tab.email ?? tab.alsoEmail;
    if (nextEmail) {
      setSubject(nextEmail.subject);
      setBody(nextEmail.body);
    } else if (tab.whatsapp) {
      setBody(tab.whatsapp.body);
    }
  };

  const copyWhatsApp = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable in insecure contexts.
    }
  };

  // A WhatsApp tab never posts the form (that would send an email): the message is copied and sent by the person.
  const isWaOnly = active?.kind === "whatsapp";

  return (
    <dialog open aria-labelledby="send-modal-title" className="send-modal">
      <PanelOpen closeHref={closeHref} />
      <div className="flex max-h-[calc(100dvh-48px)] flex-col md:flex-row">
        {/* Left context rail */}
        <aside className="flex w-full shrink-0 flex-col gap-6 overflow-y-auto bg-sunk px-7 py-8 md:w-[380px] md:px-8">
          <div className="flex flex-col gap-1.5">
            <p className="t-micro text-ink-3">Preview and send</p>
            <h2 id="send-modal-title" className="text-[24px] font-medium leading-[32px] text-ink [overflow-wrap:anywhere]">
              {title}
            </h2>
            {sub && <p className="t-body text-ink-2">{sub}</p>}
            {extra && <p className="t-small text-ink-3">{extra}</p>}
          </div>
          <div className="flex flex-col gap-5">{left}</div>
        </aside>

        {/* Right preview + actions pane */}
        <div className="flex min-w-0 flex-1 flex-col bg-surface">
          {/* Channel tabs + close */}
          <div className="flex items-center gap-2 border-b border-rule px-6 py-4 md:px-8">
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
              {tabs.map((tab) => {
                const isActive = tab.key === active?.key;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => switchTab(tab)}
                    className={
                      "t-body-m inline-flex cursor-pointer items-center gap-2 rounded-full px-4 py-2 transition-colors " +
                      (isActive
                        ? "border-2 border-ink bg-surface text-ink"
                        : "border border-rule bg-surface text-ink-2 hover:bg-sunk")
                    }
                  >
                    <Icon name={TAB_ICON[tab.kind]} size={16} />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
            <Link
              href={closeHref}
              scroll={false}
              replace
              aria-label="Close"
              className="flex size-10 shrink-0 items-center justify-center rounded-full border border-rule bg-surface text-ink hover:bg-sunk"
            >
              <Icon name="x" size={18} />
            </Link>
          </div>

          {/* Preview body */}
          <div className="flex-1 overflow-y-auto p-6 md:p-8">
            <div ref={previewRef} className="flex flex-col gap-5 rounded-[20px] bg-sunk p-5">
              {active?.invite && <InviteCard invite={active.invite} />}

              {active?.alsoEmail && (
                <div className="flex flex-col gap-2">
                  <p className="t-micro text-ink-3">Also sent: {active.alsoEmail.to}</p>
                  <EmailCard
                    email={active.alsoEmail}
                    editing={editing}
                    subject={subject}
                    body={body}
                    onSubject={setSubject}
                    onBody={setBody}
                  />
                </div>
              )}

              {active?.email && (
                <EmailCard
                  email={active.email}
                  editing={editing}
                  subject={subject}
                  body={body}
                  onSubject={setSubject}
                  onBody={setBody}
                />
              )}

              {active?.whatsapp && (
                <WhatsAppCard
                  wa={active.whatsapp}
                  editing={editing}
                  body={body}
                  onBody={setBody}
                />
              )}

              {active?.pdf && (
                <div className="overflow-hidden rounded-[18px] border border-rule bg-surface">
                  <div className="flex items-center justify-between gap-3 border-b border-rule px-5 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <Icon name="file" size={16} className="text-danger" />
                      <span className="t-body-m text-ink">{active.pdf.title}</span>
                    </div>
                    <a
                      href={active.pdf.href}
                      target="_blank"
                      rel="noreferrer"
                      className="t-label text-info underline"
                    >
                      Open in new tab
                    </a>
                  </div>
                  <iframe
                    src={active.pdf.href}
                    title={active.pdf.title}
                    className="h-[440px] w-full bg-surface"
                  />
                  {active.pdf.note && <p className="t-small border-t border-rule px-5 py-3 text-ink-3">{active.pdf.note}</p>}
                </div>
              )}
            </div>
          </div>

          {/* Sticky footer */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-rule px-6 py-4 md:px-8">
            <div className="min-w-0 flex-1">
              {disabledReason ? (
                <p className="t-small text-danger">{disabledReason}</p>
              ) : note ? (
                <p className="t-small text-ink-3">{note}</p>
              ) : null}
            </div>
            <div className="flex items-center gap-3">
              {(active?.email || active?.alsoEmail || active?.whatsapp) && (
                <button
                  type="button"
                  onClick={() => setEditing((v) => !v)}
                  className="t-body-m inline-flex cursor-pointer items-center gap-2 rounded-full border border-rule bg-surface px-5 py-2.5 text-ink hover:bg-sunk"
                >
                  <Icon name="pen" size={16} />
                  <span>{editing ? "Preview" : "Edit"}</span>
                </button>
              )}

              {active?.kind === "whatsapp" && (
                <button
                  type="button"
                  onClick={() => copyWhatsApp(editing ? body : active.whatsapp?.body ?? "")}
                  className="t-body-m inline-flex cursor-pointer items-center gap-2 rounded-full bg-ink px-6 py-2.5 text-ink-inverse transition-transform active:scale-[0.98]"
                >
                  <Icon name={copied ? "check" : "copy"} size={16} />
                  <span>{copied ? "Copied" : "Copy WhatsApp"}</span>
                </button>
              )}

              {!isWaOnly && action && (
                <form action={action} className="inline-flex">
                  {Object.entries(hidden).map(([k, v]) =>
                    v !== undefined ? <input key={k} type="hidden" name={k} value={v} /> : null,
                  )}
                  {primaryEmail && (
                    <>
                      <input type="hidden" name="subject" value={subject} />
                      <input type="hidden" name="body" value={body} />
                    </>
                  )}
                  {!primaryEmail && primaryWa && <input type="hidden" name="body" value={body} />}
                  <button
                    type="submit"
                    disabled={Boolean(disabledReason)}
                    className="t-body-m inline-flex cursor-pointer items-center gap-2 rounded-full bg-ink px-6 py-2.5 text-ink-inverse transition-transform active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    <Icon name="send" size={16} />
                    <span>{sendLabel}</span>
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </dialog>
  );
}

function InviteCard({ invite }: { invite: SendInvitePreview }) {
  return (
    <div className="overflow-hidden rounded-[18px] border border-rule bg-surface shadow-card">
      <div className="flex items-center justify-between gap-3 bg-info-soft px-5 py-3 text-info">
        <span className="t-label flex items-center gap-2">
          <Icon name="calendar" size={15} />
          {invite.banner}
        </span>
        <span className="t-label">{invite.dateTag}</span>
      </div>
      <div className="flex flex-col gap-3.5 p-5">
        <p className="t-h2 text-ink">{invite.title}</p>
        <dl className="grid grid-cols-[90px_1fr] gap-y-2.5 text-[14px]">
          <dt className="text-ink-3">When</dt>
          <dd className="text-ink">{invite.when}</dd>
          <dt className="text-ink-3">Where</dt>
          <dd className="text-ink">{invite.where}</dd>
          <dt className="text-ink-3">Guests</dt>
          <dd className="flex flex-wrap items-center gap-3">
            {invite.guests.map((g) => (
              <span key={g.name} className="inline-flex items-center gap-1.5 text-ink">
                <span className={"inline-flex size-6 items-center justify-center rounded-full text-[11px] font-medium " + (g.tone ?? "bg-sunk text-ink-2")}>
                  {g.initials}
                </span>
                <span>{g.name}</span>
              </span>
            ))}
          </dd>
          {invite.notes && (
            <>
              <dt className="text-ink-3">Notes</dt>
              <dd className="text-ink-2">{invite.notes}</dd>
            </>
          )}
          {invite.attachments && invite.attachments.length > 0 && (
            <>
              <dt className="text-ink-3">Attached</dt>
              <dd className="flex flex-wrap gap-2">
                {invite.attachments.map((att) => (
                  <AttachmentPill key={att.name} att={att} />
                ))}
              </dd>
            </>
          )}
        </dl>
      </div>
    </div>
  );
}

function EmailCard({
  email,
  editing,
  subject,
  body,
  onSubject,
  onBody,
}: {
  email: SendEmailPreview;
  editing: boolean;
  subject: string;
  body: string;
  onSubject: (v: string) => void;
  onBody: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-4 rounded-[18px] border border-rule bg-surface p-5 shadow-card">
      {editing ? (
        <input
          type="text"
          value={subject}
          onChange={(e) => onSubject(e.target.value)}
          aria-label="Email subject"
          className="t-h2 w-full rounded-[12px] border border-rule-strong bg-sunk px-3.5 py-2 text-ink outline-none focus:border-ink"
        />
      ) : (
        <p className="t-h2 text-ink">{subject || email.subject}</p>
      )}
      <dl className="grid grid-cols-[64px_1fr] gap-y-1 border-b border-rule pb-3 text-[13px]">
        <dt className="text-ink-3">From</dt>
        <dd className="text-ink-2">{email.from}</dd>
        <dt className="text-ink-3">To</dt>
        <dd className="text-ink">{email.to}</dd>
      </dl>
      {editing ? (
        <textarea
          value={body}
          onChange={(e) => onBody(e.target.value)}
          rows={10}
          aria-label="Email body"
          className="t-body w-full rounded-[12px] border border-rule-strong bg-sunk p-3.5 text-ink outline-none focus:border-ink"
        />
      ) : (
        <div className="t-body whitespace-pre-wrap text-ink">{body || email.body}</div>
      )}
      {email.attachments && email.attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 border-t border-rule pt-3">
          {email.attachments.map((att) => (
            <AttachmentPill key={att.name} att={att} />
          ))}
        </div>
      )}
    </div>
  );
}

function WhatsAppCard({
  wa,
  editing,
  body,
  onBody,
}: {
  wa: SendWhatsAppPreview;
  editing: boolean;
  body: string;
  onBody: (v: string) => void;
}) {
  const initials = wa.recipient.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("");
  return (
    <div className="mx-auto flex w-full max-w-[600px] flex-col gap-2.5">
      <p className="t-micro text-ink-3">HOW IT LOOKS IN WHATSAPP</p>
      <div className="overflow-hidden rounded-[18px] shadow-card">
        <div className="flex items-center gap-3 bg-brand px-5 py-3.5 text-white">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white t-label text-brand">{initials}</span>
          <span className="flex min-w-0 flex-col">
            <span className="t-body-m truncate">{wa.recipient}</span>
            {wa.phone && <span className="t-small truncate text-white/80">{wa.phone}</span>}
          </span>
        </div>
        <div className="flex flex-col gap-3 bg-sunk px-5 py-5">
          <span className="t-micro self-end rounded-[8px] bg-surface px-2.5 py-1 text-ink-2">Today</span>
          <div className="rounded-[14px] bg-brand-tint p-4 text-ink">
            {editing ? (
              <textarea
                value={body}
                onChange={(e) => onBody(e.target.value)}
                rows={8}
                aria-label="WhatsApp message"
                className="t-body w-full rounded-[10px] border border-rule-strong bg-surface p-2.5 text-ink outline-none"
              />
            ) : (
              <p className="t-body whitespace-pre-wrap">{body || wa.body}</p>
            )}
            {wa.time && <p className="t-small mt-2 text-right text-ink-3">{wa.time}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

function AttachmentPill({ att }: { att: SendAttachment }) {
  const inner = (
    <span className="t-label inline-flex items-center gap-2 rounded-full border border-rule bg-sunk px-3 py-1.5 text-ink">
      <Icon name="file" size={14} className="text-danger" />
      <span>{att.name}</span>
      {att.size && <span className="text-ink-3">{att.size}</span>}
    </span>
  );
  return att.href ? (
    <a href={att.href} target="_blank" rel="noreferrer" className="hover:opacity-80">
      {inner}
    </a>
  ) : (
    inner
  );
}

/** Small left-rail section block inside PreviewAndSend. */
export function SendLeftSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2.5">
      <p className="t-micro text-ink-3">{title}</p>
      {children}
    </div>
  );
}
