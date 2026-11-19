import { approveAndSend, draftNextChase, sendAgreement, writeNewMessage } from "@/app/actions";
import PreviewAndSend, { SendLeftSection } from "@/app/ui/PreviewAndSend";
import { agreementForLead, textOf } from "@/data/desk";
import type { OpsDatabase, OpsMember } from "@/data/types";
import { checkInText, type AgreementCard, type ClientCard } from "@/lib/clientsView";
import { coverDraft, missingFields } from "@/lib/esa";

/**
 * C1 send · Check in with the client (Figma 3:12906)
 * C2 send · Send the agreement (Figma 3:11852)
 * C3 send · Chase the agreement (Figma 3:12137)
 */

export function CheckInSendModal({
  card,
  me,
  closeHref,
}: {
  card: ClientCard;
  me: OpsMember;
  closeHref: string;
}) {
  const email = card.person?.email ?? "";
  const phone = card.person?.phone ?? "";
  const body = checkInText(card.person, card.owner || me.name);
  const subject = `Quick check-in — ${card.name}`;

  return (
    <PreviewAndSend
      title={`Check in with ${card.name}`}
      sub={card.person ? `${card.person.name}${card.person.role ? ", " + card.person.role : ""}` : "Client HR"}
      closeHref={closeHref}
      action={email ? writeNewMessage : undefined}
      hidden={{
        to: email,
        about: `client|${card.id}`,
        back: closeHref,
        sendNow: "1",
      }}
      sendLabel="Send check-in"
      disabledReason={email ? null : "Add a client contact email before sending by email (you can still copy the WhatsApp message)."}
      note="Goes through the outbound gate. In test mode it redirects to the test address."
      left={
        <>
          <SendLeftSection title="Include in the message">
            <div className="flex flex-col gap-2">
              <div className="rounded-[14px] border border-rule bg-surface px-4 py-3">
                <p className="t-body-m text-ink">{card.status.text}</p>
                <p className="t-small text-ink-3">{card.line || "Active client"}</p>
              </div>
              <div className="rounded-[14px] border border-rule bg-surface px-4 py-3">
                <p className="t-body-m text-ink">Anything we can do better</p>
                <p className="t-small text-ink-3">Short check-in to keep the client warm</p>
              </div>
            </div>
          </SendLeftSection>
          {card.person && (
            <SendLeftSection title="To">
              <div className="rounded-[14px] border border-rule bg-surface px-4 py-3">
                <p className="t-body-m text-ink">{card.person.name}</p>
                <p className="t-small text-ink-3">{email || phone || "No address on file"}</p>
              </div>
            </SendLeftSection>
          )}
        </>
      }
      tabs={[
        {
          key: "email",
          label: `Email to ${card.person?.name ?? card.name}`,
          kind: "email",
          email: {
            from: `${me.name}, Career141 <${me.email}>`,
            to: email || "No email on file",
            subject,
            body,
          },
        },
        {
          key: "whatsapp",
          label: "WhatsApp",
          kind: "whatsapp",
          whatsapp: {
            recipient: card.person?.name ?? card.name,
            phone,
            body,
          },
        },
      ]}
    />
  );
}

export function SendAgreementModal({
  db,
  leadId,
  me,
  closeHref,
}: {
  db: OpsDatabase;
  leadId: string;
  me: OpsMember;
  closeHref: string;
}) {
  const lead = db.leads.find((l) => l.id === leadId);
  if (!lead) return null;
  const esa = agreementForLead(db, leadId);
  const fields = esa?.fields ?? {};
  const missing = missingFields(fields);
  const template = db.templates.find((t) => t.key === "esa.cover") ?? null;
  const filled = coverDraft(template, fields);
  const subject = "problem" in filled ? `Executive Search Agreement — ${lead.company}` : filled.subject;
  const body =
    "problem" in filled
      ? `Dear ${lead.contactName || "there"},\n\nPlease find attached our Executive Search Agreement for ${lead.company}.\n\nKind regards,\n${me.name}`
      : filled.body;
  const draftFile = esa?.draftFileId ? db.files.find((f) => f.id === esa.draftFileId) : null;
  const to = lead.contactEmail ?? "";
  const disabledReason = !esa
    ? "Save the agreement details first in the Send the agreement panel."
    : missing.length > 0
      ? `Fill required fields first: ${missing.slice(0, 3).map((f) => f.label).join(", ")}${missing.length > 3 ? "…" : ""}.`
      : !to
        ? "Add a contact email address on this enquiry first."
        : null;

  return (
    <PreviewAndSend
      title="Send the agreement"
      sub={`${lead.company} · Agreement v${esa?.version ?? 1}`}
      closeHref={closeHref}
      action={esa ? sendAgreement : undefined}
      hidden={{
        agreementId: esa?.id,
        leadId: lead.id,
        back: closeHref,
      }}
      sendLabel="Send the agreement"
      disabledReason={disabledReason}
      note="Fills the Word template, makes the PDF, and drafts/sends through the outbound gate."
      left={
        <>
          <SendLeftSection title="The terms">
            <div className="flex flex-col gap-2 rounded-[16px] border border-rule bg-surface p-4">
              {[
                ["Fee", fields.fee ?? "Not set"],
                ["Guarantee", fields.guaranteeDays ? `${fields.guaranteeDays} days` : "90 days"],
                ["Payment", fields.paymentDays ? `${fields.paymentDays} days` : "30 days"],
                ["Signatory", fields.signatoryName ?? lead.contactName],
              ].map(([k, v]) => (
                <div key={k} className="flex items-center justify-between gap-2 text-[14px]">
                  <span className="text-ink-3">{k}</span>
                  <span className="font-medium text-ink">{v || "—"}</span>
                </div>
              ))}
            </div>
          </SendLeftSection>
          {missing.length > 0 && (
            <SendLeftSection title="Missing fields">
              <p className="t-small rounded-[14px] bg-bg-danger px-3.5 py-2.5 text-danger">
                {missing.map((f) => f.label).join(", ")}
              </p>
            </SendLeftSection>
          )}
        </>
      }
      tabs={[
        {
          key: "email",
          label: `Email to ${lead.contactName || lead.company}`,
          kind: "email",
          email: {
            from: `${me.name}, Career141 <${me.email}>`,
            to: to || "No email on file",
            subject,
            body,
            attachments: draftFile
              ? [{ name: draftFile.name, href: `/api/files/${draftFile.id}/view` }]
              : [{ name: `ESA_${lead.company.replace(/\s+/g, "_")}_v${esa?.version ?? 1}.pdf` }],
          },
        },
        ...(draftFile
          ? [
              {
                key: "pdf",
                label: "Agreement PDF",
                kind: "pdf" as const,
                pdf: {
                  title: draftFile.name,
                  href: `/api/files/${draftFile.id}/view`,
                  note: "Filled from the active ESA template on Files.",
                },
              },
            ]
          : []),
      ]}
    />
  );
}

export function ChaseAgreementSendModal({
  db,
  card,
  me,
  closeHref,
}: {
  db: OpsDatabase;
  card: AgreementCard;
  me: OpsMember;
  closeHref: string;
}) {
  const esa = db.agreements.find((a) => a.id === card.id);
  if (!esa) return null;
  const draft = db.messages.find(
    (m) => m.subjectType === "agreement" && m.subjectId === esa.id && m.state === "draft",
  );
  const lead = db.leads.find((l) => l.id === esa.leadId);
  const to = draft?.to?.[0] ?? lead?.contactEmail ?? "";
  const phone = lead?.contactPhone ?? "";
  const step = card.copy?.step ?? esa.chaseStep + 1;
  const body =
    draft?.body ??
    card.copy?.text ??
    `Hi ${lead?.contactName || "there"},\n\nFollowing up on the Executive Search Agreement we sent for ${card.company}. Please let us know if you have any questions or if you are ready to sign so we can start the search.\n\nKind regards,\n${me.name}`;
  const subject = draft?.subject ?? `Following up: Executive Search Agreement — ${card.company}`;
  const brand = textOf(db, "brand.name", "Career141");

  return (
    <PreviewAndSend
      title={`Chase ${step} · agreement`}
      sub={`${card.company} · Agreement v${esa.version}`}
      closeHref={closeHref}
      action={draft ? approveAndSend : draftNextChase}
      hidden={
        draft
          ? { messageId: draft.id, back: closeHref }
          : { esaId: esa.id, back: closeHref }
      }
      sendLabel={draft ? `Send chase ${step}` : `Draft chase ${step}`}
      disabledReason={to ? null : "Add a contact email address on this enquiry first."}
      note={draft ? "Approves and sends the drafted chase through the outbound gate." : "Creates the chase draft for approval."}
      left={
        <SendLeftSection title="Chase history">
          <div className="flex flex-col gap-2">
            <div className="rounded-[14px] border border-rule bg-surface px-4 py-3">
              <p className="t-body-m text-ink">Chases sent so far: {esa.chaseStep}</p>
              <p className="t-small text-ink-3">Chase {step} of 6 is next · {brand}</p>
            </div>
          </div>
        </SendLeftSection>
      }
      tabs={[
        {
          key: "email",
          label: `Email to ${lead?.contactName || card.company}`,
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
          label: "WhatsApp",
          kind: "whatsapp",
          whatsapp: {
            recipient: lead?.contactName || card.company,
            phone,
            body,
          },
        },
      ]}
    />
  );
}
