import { approveWeeklyReport, writeNewMessage } from "@/app/actions";
import PreviewAndSend, { SendLeftSection } from "@/app/ui/PreviewAndSend";
import { clientIn, reportsNewestFirst } from "@/data/desk";
import type { OpsDatabase, OpsMember } from "@/data/types";
import { contactsFor } from "@/lib/contacts";
import { recipientsFrom } from "@/lib/reports";

/**
 * P1 send · Ask the TA for CVs (Figma 3:12820)
 * P1 send · Chase the client HR (Figma 3:12990)
 * P1 send · Weekly report (Figma 3:12369)
 */

export function PositionSendModal({
  send,
  on,
  db,
  me,
  taPeople,
  closeHref,
}: {
  send: string;
  on?: string;
  db: OpsDatabase;
  me: OpsMember;
  taPeople: { id: string; fullName: string; email?: string }[];
  closeHref: string;
}) {
  if (send === "weekly-report") {
    const report = reportsNewestFirst(db)[0] ?? null;
    const recipients = recipientsFrom(db);
    const to = recipients.join(", ");
    const openCount = db.positions.filter((p) => p.stage !== "closed").length;
    const summaryLines = db.positions
      .filter((p) => p.stage !== "closed")
      .slice(0, 10)
      .map((p) => {
        const c = p.clientId ? clientIn(db, p.clientId) : null;
        return `• ${c?.name ?? "Client"} — ${p.title} (${p.stage})`;
      });
    const draftedMsg = report?.messageId ? db.messages.find((m) => m.id === report.messageId) : null;
    const body =
      draftedMsg?.body ??
      `Dear Mr Azeem,\n\nHere is this week's active roles summary (${openCount} open roles):\n\n${summaryLines.join("\n")}\n\nKind regards,\n${me.name}`;

    return (
      <PreviewAndSend
        title="Weekly report"
        sub={`${openCount} open roles · Goes to Mr Azeem by email only`}
        closeHref={closeHref}
        action={report ? approveWeeklyReport : writeNewMessage}
        hidden={
          report
            ? { reportId: report.id, back: closeHref }
            : { to, about: "report|weekly", back: closeHref, sendNow: "1" }
        }
        sendLabel="Send weekly report"
        disabledReason={to ? null : "Set report.recipients in Settings before sending the weekly report."}
        note="Goes through the outbound gate to the configured Director address."
        left={
          <>
            <SendLeftSection title="This week">
              <div className="flex flex-col gap-2 rounded-[16px] border border-rule bg-surface p-4">
                <div className="flex items-center justify-between text-[14px]">
                  <span className="text-ink-3">Open roles</span>
                  <span className="font-medium text-ink">{openCount}</span>
                </div>
                <div className="flex items-center justify-between text-[14px]">
                  <span className="text-ink-3">Report status</span>
                  <span className="font-medium text-ink">{report ? report.state : "Live snapshot"}</span>
                </div>
              </div>
            </SendLeftSection>
            <SendLeftSection title="To">
              <div className="rounded-[14px] border border-rule bg-surface px-4 py-3">
                <p className="t-body-m text-ink">Director of Operations</p>
                <p className="t-small text-ink-3">{to || "No recipient set"}</p>
              </div>
            </SendLeftSection>
          </>
        }
        tabs={[
          {
            key: "email",
            label: "Email to Mr Azeem",
            kind: "email",
            email: {
              from: `${me.name}, Career141 <${me.email}>`,
              to: to || "report.recipients not set",
              subject: `Weekly Active Positions Report — ${openCount} open roles`,
              body,
            },
          },
        ]}
      />
    );
  }

  const pos = on ? db.positions.find((p) => p.id === on) : null;
  if (!pos) return null;
  const client = pos.clientId ? clientIn(db, pos.clientId) : null;
  const clientName = client?.name ?? "Client";

  if (send === "ask-ta") {
    const ta = pos.primaryTaId ? taPeople.find((t) => t.id === pos.primaryTaId) : null;
    const taName = ta?.fullName ?? "TA";
    const to = ta?.email ?? "";
    const subject = `CVs needed — ${clientName} · ${pos.title}`;
    const body = `Hi ${taName},\n\nFollowing up on CVs for ${clientName} — ${pos.title}. Could you share the next ready set so we can send it to the client on time?\n\nThank you,\n${me.name}`;

    return (
      <PreviewAndSend
        title={`Ask ${taName} for CVs`}
        sub={`${clientName} > ${pos.title}`}
        closeHref={closeHref}
        action={to ? writeNewMessage : undefined}
        hidden={{
          to,
          about: `position|${pos.id}`,
          back: closeHref,
          sendNow: "1",
        }}
        sendLabel={`Send to ${taName}`}
        disabledReason={to ? null : "No email address on file for this TA (you can copy the WhatsApp message instead)."}
        note="Goes through the outbound gate."
        left={
          <SendLeftSection title="What to ask">
            <div className="rounded-[14px] border border-rule bg-surface px-4 py-3">
              <p className="t-body-m text-ink">{pos.title}</p>
              <p className="t-small text-ink-3">Primary TA: {taName}</p>
            </div>
          </SendLeftSection>
        }
        tabs={[
          {
            key: "email",
            label: `Email to ${taName}`,
            kind: "email",
            email: {
              from: `${me.name}, Career141 <${me.email}>`,
              to: to || "No email on file",
              subject,
              body,
            },
          },
          {
            key: "whatsapp",
            label: `WhatsApp to ${taName}`,
            kind: "whatsapp",
            whatsapp: { recipient: taName, body },
          },
        ]}
      />
    );
  }

  if (send === "chase-hr") {
    const contacts = contactsFor({ client: client?.contacts, position: pos.contacts });
    const hr = contacts.find((c) => c.role === "hr") ?? contacts[0] ?? null;
    const to = hr?.email ?? "";
    const phone = hr?.phone ?? "";
    const hrName = hr?.name || clientName;
    const subject = `Following up — ${pos.title} (${clientName})`;
    const body = `Hi ${hrName},\n\nFollowing up on ${pos.title}. Could you share your update or next steps when you have a moment?\n\nKind regards,\n${me.name}`;

    return (
      <PreviewAndSend
        title={`Chase ${clientName}`}
        sub={pos.title}
        closeHref={closeHref}
        action={to ? writeNewMessage : undefined}
        hidden={{
          to,
          about: `position|${pos.id}`,
          back: closeHref,
          sendNow: "1",
        }}
        sendLabel="Send follow-up"
        disabledReason={to ? null : "No HR email address on file (you can copy the WhatsApp message instead)."}
        note="Goes through the outbound gate."
        left={
          <SendLeftSection title="Where it stands">
            <div className="rounded-[14px] border border-rule bg-surface px-4 py-3">
              <p className="t-body-m text-ink">{hrName}</p>
              <p className="t-small text-ink-3">{to || phone || "No contact details"}</p>
            </div>
          </SendLeftSection>
        }
        tabs={[
          {
            key: "whatsapp",
            label: `WhatsApp to ${hrName}`,
            kind: "whatsapp",
            whatsapp: { recipient: hrName, phone, body },
          },
          {
            key: "email",
            label: `Email to ${hrName}`,
            kind: "email",
            email: {
              from: `${me.name}, Career141 <${me.email}>`,
              to: to || "No email on file",
              subject,
              body,
            },
          },
        ]}
      />
    );
  }

  return null;
}
