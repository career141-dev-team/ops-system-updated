"use client";

import { useState } from "react";

import Icon from "@/app/Icon";
import PreviewAndSend, { SendLeftSection } from "@/app/ui/PreviewAndSend";
import { checkInMessage, type CheckInPart } from "@/lib/checkIn";

const first = (name: string) => name.trim().split(/\s+/)[0] ?? "";
const initials = (name: string) => {
  const w = name.trim().split(/\s+/).filter(Boolean);
  return ((w[0]?.[0] ?? "") + (w.length > 1 ? (w[w.length - 1][0] ?? "") : "")).toUpperCase() || "—";
};

/**
 * "Check in with the client" (Figma 222:1040): the left rail lists what can go in the message, each ticked on,
 * and the message on the right follows the ticks. Changing a tick writes the message again (an edit made by
 * hand is lost, which the Edit button's text says is the way to start from the ticks).
 */
export default function CheckInModal(p: {
  title: string;
  sub: string;
  extra: string;
  closeHref: string;
  action?: (formData: FormData) => void | Promise<void>;
  hidden: Record<string, string | undefined>;
  disabledReason: string | null;
  contact: { name: string; role: string; company: string; email: string; phone: string } | null;
  sender: { name: string; email: string };
  clientName: string;
  settling: { name: string; joined: string } | null;
  roles: string[];
  time: string;
}) {
  const [on, setOn] = useState<Record<CheckInPart, boolean>>({ settling: true, places: true, better: true });
  const items: { part: CheckInPart; title: string; sub: string }[] = [
    ...(p.settling ? [{ part: "settling" as const, title: "How " + first(p.settling.name) + " is settling in", sub: "Joined " + p.settling.joined }] : []),
    ...(p.roles.length ? [{ part: "places" as const, title: p.roles.length === 1 ? "The open place" : "The " + p.roles.length + " open places", sub: p.roles.join(", ") }] : []),
    { part: "better" as const, title: "Anything we can do better", sub: "Open question" },
  ];
  const parts = items.filter((i) => on[i.part]).map((i) => i.part);
  const body = checkInMessage({ contact: p.contact?.name ?? null, sender: p.sender.name, parts, settling: p.settling, roles: p.roles });
  const contactFirst = p.contact ? first(p.contact.name) : p.clientName;
  return (
    <PreviewAndSend
      key={parts.join(",")}
      title={p.title}
      sub={p.sub}
      extra={p.extra}
      closeHref={p.closeHref}
      action={p.action}
      hidden={p.hidden}
      sendLabel="Send check-in"
      disabledReason={p.disabledReason}
      note="Goes through the outbound gate. In test mode it redirects to the test address. WhatsApp is copied and sent by you."
      left={
        <>
          <SendLeftSection title="Include in the message">
            <div className="flex flex-col gap-2">
              {items.map((i) => (
                <button
                  key={i.part}
                  type="button"
                  role="checkbox"
                  aria-checked={on[i.part]}
                  onClick={() => setOn((s) => ({ ...s, [i.part]: !s[i.part] }))}
                  className="flex cursor-pointer items-center gap-3.5 rounded-[14px] bg-surface px-4 py-3 text-left"
                >
                  <span className={"flex size-6 shrink-0 items-center justify-center rounded-[7px] " + (on[i.part] ? "bg-ink text-ink-inverse" : "border-2 border-rule-strong bg-surface")}>
                    {on[i.part] && <Icon name="check" size={14} />}
                  </span>
                  <span className="flex min-w-0 flex-col">
                    <span className="t-body-m text-ink">{i.title}</span>
                    <span className="t-small truncate text-ink-3">{i.sub}</span>
                  </span>
                </button>
              ))}
            </div>
          </SendLeftSection>
          {p.contact && (
            <SendLeftSection title="To">
              <div className="flex items-center gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-soft t-label text-brand">{initials(p.contact.name)}</span>
                <span className="flex min-w-0 flex-col">
                  <span className="t-body-m text-ink">{p.contact.name}</span>
                  <span className="t-small truncate text-ink-3">{[p.contact.role ? p.contact.role.toUpperCase() : "", p.contact.company].filter(Boolean).join(", ")}</span>
                </span>
              </div>
            </SendLeftSection>
          )}
        </>
      }
      tabs={[
        { key: "whatsapp", label: "WhatsApp to " + contactFirst, kind: "whatsapp", whatsapp: { recipient: p.contact?.name ?? p.clientName, phone: p.contact?.phone ?? "", body, time: p.time } },
        {
          key: "email",
          label: "Email",
          kind: "email",
          email: { from: p.sender.name + ", Career141 <" + p.sender.email + ">", to: p.contact?.email || "No email on file", subject: "Quick check-in — " + p.clientName, body },
        },
      ]}
    />
  );
}
