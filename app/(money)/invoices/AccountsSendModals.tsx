import { sendInvoice, writeNewMessage } from "@/app/actions";
import PreviewAndSend, { SendLeftSection } from "@/app/ui/PreviewAndSend";
import { clientIn, placementIn, positionIn } from "@/data/desk";
import type { OpsDatabase, OpsMember } from "@/data/types";
import { balanceOf, feeMonthsFor, invoiceBlockers, isExpat, money } from "@/lib/money";
import { recipientsFrom } from "@/lib/reports";

/**
 * A1 send · Invoice (Figma 3:12048)
 * A2 send · Ask Mr Azeem about the refund (Figma 3:12462)
 */

export function AccountsSendModal({
  send,
  on,
  db,
  me,
  closeHref,
}: {
  send: string;
  on?: string;
  db: OpsDatabase;
  me: OpsMember;
  closeHref: string;
}) {
  if (send === "invoice" && on) {
    const inv = db.invoices.find((i) => i.id === on);
    if (!inv) return null;
    const client = inv.clientId ? clientIn(db, inv.clientId) : null;
    const pl = inv.placementId ? placementIn(db, inv.placementId) : null;
    const role = pl?.positionId ? positionIn(db, pl.positionId) : null;
    const billingEmail = client?.billingEmail ?? client?.contacts?.[0]?.email ?? "";
    const amountText = money(balanceOf(inv) > 0 ? balanceOf(inv) : inv.amount, inv.currency);
    const pdfFile =
      db.files
        .filter((f) => f.subjectType === "invoice" && f.subjectId === inv.id)
        .at(-1) ?? null;
    const dueStr = inv.dueAt
      ? new Date(inv.dueAt + 5.5 * 3_600_000).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })
      : "30 days from joining";

    const body = `Dear ${client?.billingName || client?.name || "Finance Team"},\n\nPlease find attached invoice ${inv.number} for ${amountText}${pl ? ` for the placement of ${pl.candidateName}` : ""}${role ? ` (${role.title})` : ""}.\n\nPayment is due on ${dueStr}.\n\nKind regards,\n${me.name}\nCareer141 Accounts`;

    const blockers = inv.kind === "fee" ? invoiceBlockers(pl) : [];
    const disabledReason = !billingEmail
      ? "Add the client's billing email address before sending."
      : blockers.length > 0
        ? "Cannot send yet: " + blockers.join(" and ") + "."
        : null;

    return (
      <PreviewAndSend
        title="Send the invoice"
        sub={`${inv.number} · ${client?.name ?? "Client"}`}
        closeHref={closeHref}
        action={sendInvoice}
        hidden={{
          invoiceId: inv.id,
          back: closeHref,
        }}
        sendLabel="Send the invoice"
        disabledReason={disabledReason}
        note="Generates/attaches the invoice PDF and sends through the outbound gate."
        left={
          <>
            <SendLeftSection title="Amount">
              <div className="rounded-[16px] border border-rule bg-surface p-4">
                <p className="text-[24px] font-medium leading-8 text-ink">{amountText}</p>
                <p className="t-small text-ink-3">Due {dueStr}</p>
                {pl && (
                  <p className={"t-small mt-1 " + (pl.nationalityConfirmedAt && pl.nationality ? "text-ink-2" : "text-warn")}>
                    {pl.nationalityConfirmedAt && pl.nationality
                      ? `${pl.nationality} · ${isExpat(pl.nationality) ? `Expat (${feeMonthsFor(pl)} mo)` : `Local (${feeMonthsFor(pl)} mo)`}`
                      : "Nationality not confirmed"}
                  </p>
                )}
              </div>
            </SendLeftSection>
            <SendLeftSection title="To">
              <div className="rounded-[14px] border border-rule bg-surface px-4 py-3">
                <p className="t-body-m text-ink">{client?.billingName || client?.name || "Client"}</p>
                <p className="t-small text-ink-3">{billingEmail || "Billing email missing"}</p>
              </div>
            </SendLeftSection>
          </>
        }
        tabs={[
          {
            key: "email",
            label: `Email to ${client?.billingName || "Finance"}`,
            kind: "email",
            email: {
              from: `${me.name}, Career141 <${me.email}>`,
              to: billingEmail || "Billing email missing",
              subject: `Invoice ${inv.number} — ${client?.name ?? "Career141"}`,
              body,
              attachments: pdfFile
                ? [{ name: pdfFile.name, href: `/api/files/${pdfFile.id}/view` }]
                : [{ name: `${inv.number}.pdf` }],
            },
          },
          ...(pdfFile
            ? [
                {
                  key: "pdf",
                  label: "Invoice PDF",
                  kind: "pdf" as const,
                  pdf: {
                    title: pdfFile.name,
                    href: `/api/files/${pdfFile.id}/view`,
                  },
                },
              ]
            : []),
        ]}
      />
    );
  }

  if (send === "ask-refund" && on) {
    const g = db.guarantees.find((x) => x.id === on);
    if (!g) return null;
    const pl = placementIn(db, g.placementId);
    const client = pl?.clientId ? clientIn(db, pl.clientId) : null;
    const role = pl?.positionId ? positionIn(db, pl.positionId) : null;
    const inv = db.invoices.find((i) => i.placementId === g.placementId && i.kind === "fee");
    const paid = inv ? inv.payments.reduce((sum, p) => sum + p.amount, 0) || inv.amount : 0;
    const refund = Math.round(paid * 0.5);
    const to = recipientsFrom(db).join(", ");
    const body = `Dear Mr Azeem,\n\nRequesting your decision on a guarantee refund for ${client?.name ?? "Client"}${role ? ` (${role.title})` : ""}.\n\n• Candidate: ${pl?.candidateName ?? "Placed candidate"}\n• Invoice: ${inv?.number ?? "—"} (${inv ? money(paid, inv.currency) : "—"})\n• 50% refund figure per agreement: ${inv ? money(refund, inv.currency) : "—"}\n\nPlease reply with your decision (approve or decline, with any notes).\n\nKind regards,\n${me.name}`;

    return (
      <PreviewAndSend
        title="Ask Mr Azeem · refund"
        sub={`${client?.name ?? "Client"}${role ? ` > ${role.title}` : ""}`}
        closeHref={closeHref}
        action={to ? writeNewMessage : undefined}
        hidden={{
          to,
          about: `guarantee|${g.id}`,
          back: closeHref,
          sendNow: "1",
        }}
        sendLabel="Send email to Mr Azeem"
        disabledReason={to ? null : "Set report.recipients in Settings so Mr Azeem's email address is known."}
        note="Only the Director decides refunds. Goes through the outbound gate."
        left={
          <SendLeftSection title="The case">
            <div className="flex flex-col gap-1.5 rounded-[16px] border border-rule bg-surface p-4">
              <p className="t-body-m text-ink">
                Refund {inv ? money(refund, inv.currency) : "—"}
              </p>
              <p className="t-small text-ink-3">
                50% of {inv?.number ?? "fee invoice"} ({inv ? money(paid, inv.currency) : "—"})
              </p>
              <p className="t-small text-ink-3">He decides by email only.</p>
            </div>
          </SendLeftSection>
        }
        tabs={[
          {
            key: "email",
            label: "Email to Mr Azeem",
            kind: "email",
            email: {
              from: `${me.name}, Career141 <${me.email}>`,
              to: to || "report.recipients not set",
              subject: `Refund decision needed — ${client?.name ?? "Client"} (${pl?.candidateName ?? "Guarantee"})`,
              body,
            },
          },
        ]}
      />
    );
  }

  return null;
}
