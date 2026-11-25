import { approveAndSend, draftNextChase, sendAgreement, writeNewMessage } from "@/app/actions";
import PreviewAndSend, { SendLeftSection } from "@/app/ui/PreviewAndSend";
import { agreementForLead, textOf } from "@/data/desk";
import type { OpsDatabase, OpsMember } from "@/data/types";
import Icon from "@/app/Icon";
import { chaseRows, termRows } from "@/lib/agreementView";
import { clockWords, dayWords, type AgreementCard, type ClientCard } from "@/lib/clientsView";
import { lastTalkLine, recentJoiner } from "@/lib/checkIn";
import CheckInModal from "./CheckInModal";
import { agreementVersions, coverDraft, missingFields } from "@/lib/esa";

/**
 * C1 send · Check in with the client (Figma 3:12906)
 * C2 send · Send the agreement (Figma 3:11852)
 * C3 send · Chase the agreement (Figma 3:12137)
 */

export function CheckInSendModal({
  card,
  me,
  closeHref,
  db,
  now = Date.now(),
}: {
  card: ClientCard;
  me: OpsMember;
  closeHref: string;
  db: OpsDatabase;
  now?: number;
}) {
  const email = card.person?.email ?? "";
  const phone = card.person?.phone ?? "";
  const person = card.person;
  return (
    <CheckInModal
      title={`Check in with ${card.name}`}
      sub={person ? `${person.name}${person.role ? ", " + (person.role.length <= 3 ? person.role.toUpperCase() : person.role) : ""}` : "Client HR"}
      extra={lastTalkLine(card.quietDays, now)}
      closeHref={closeHref}
      action={email ? writeNewMessage : undefined}
      hidden={{ to: email, about: `client|${card.id}`, back: closeHref, sendNow: "1" }}
      disabledReason={email ? null : "Add a client contact email before sending by email (you can still copy the WhatsApp message)."}
      contact={person ? { name: person.name, role: person.role ?? "", company: card.name, email, phone } : null}
      sender={{ name: card.owner || me.name, email: me.email }}
      clientName={card.name}
      settling={recentJoiner(db, card.id, now)}
      roles={card.openRoles.map((r) => r.title)}
      time={clockWords(now)}
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
  const esaFiles = esa
    ? db.files.filter((f) => (f.subjectType === "esa" && f.subjectId === esa.id) || f.id === esa.draftFileId || f.id === esa.signedFileId || f.id === esa.countersignedFileId)
    : [];
  const draftFile =
    agreementVersions(esaFiles)[0]?.file ??
    (esa?.draftFileId ? db.files.find((f) => f.id === esa.draftFileId) : null) ??
    null;
  const to = fields.signatoryEmail || lead.contactEmail || "";
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
      extra="Not sent yet. We cannot start the search until it is signed."
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
            <div className="flex flex-col rounded-[16px] bg-surface">
              {termRows(fields).map((r) => (
                <div key={r.label} className="flex items-center gap-4 border-t border-rule px-4 py-3 first:border-t-0">
                  <span className="t-body w-24 shrink-0 text-ink-3">{r.label}</span>
                  <span className="t-body-m text-[17px] text-ink">{r.value}</span>
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
          label: `Email to ${(fields.signatoryName || lead.contactName || lead.company).trim().split(/\s+/)[0]}`,
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
  now = Date.now(),
}: {
  db: OpsDatabase;
  card: AgreementCard;
  me: OpsMember;
  closeHref: string;
  now?: number;
}) {
  const esa = db.agreements.find((a) => a.id === card.id);
  if (!esa) return null;
  const draft = db.messages.find(
    (m) => m.subjectType === "agreement" && m.subjectId === esa.id && m.state === "draft",
  );
  const lead = db.leads.find((l) => l.id === esa.leadId);
  const to = draft?.to?.[0] ?? esa.fields.signatoryEmail ?? lead?.contactEmail ?? "";
  const phone = esa.fields.signatoryPhone || lead?.contactPhone || "";
  const step = card.copy?.step ?? esa.chaseStep + 1;
  const body =
    draft?.body ??
    card.copy?.text ??
    `Hi ${esa.fields.signatoryName?.trim().split(/\s+/)[0] || lead?.contactName || "there"},\n\nFollowing up on the Executive Search Agreement we sent for ${card.company}. Please let us know if you have any questions or if you are ready to sign so we can start the search.\n\nKind regards,\n${me.name}`;
  const subject = draft?.subject ?? `Following up: Executive Search Agreement — ${card.company}`;
  const brand = textOf(db, "brand.name", "Career141");
  const contact = esa.fields.signatoryName || lead?.contactName || card.company;
  const contactFirst = contact.trim().split(/\s+/)[0];
  const waBody = esa.sentAt
    ? `Hi ${contactFirst}, this is ${me.name.trim().split(/\s+/)[0]} from ${brand}. A gentle reminder about the agreement we sent on ${dayWords(esa.sentAt)}. It is not signed yet, and we can only start the search once it is.\n\nCould you sign and send it back? Thank you!`
    : body;
  const rows = chaseRows(esa, now);

  return (
    <PreviewAndSend
      title={`Chase ${step} · agreement`}
      sub={[card.company, esa.fields.signatoryTitle].filter(Boolean).join(" · ")}
      extra={esa.sentAt ? `Agreement sent ${dayWords(esa.sentAt)}, not signed. No TA until it is.` : undefined}
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
            {rows.length === 0 && (
              <div className="rounded-[14px] bg-surface px-4 py-3">
                <p className="t-body-m text-ink">Chase {step} of 6 is next</p>
                <p className="t-small text-ink-3">{brand}</p>
              </div>
            )}
            {rows.map((r) => (
              <div key={r.title} className={"flex items-start gap-3 rounded-[14px] px-4 py-3.5 " + (r.kind === "sent" ? "bg-brand-soft" : "bg-warn-soft")}>
                <Icon name={r.kind === "sent" ? "check" : "clock"} size={20} className={"mt-0.5 shrink-0 " + (r.kind === "sent" ? "text-brand" : "text-warn")} />
                <span className="flex min-w-0 flex-col">
                  <span className="t-body-m text-[17px] text-ink">{r.title}</span>
                  <span className="t-small text-ink-2">{r.sub}</span>
                </span>
              </div>
            ))}
          </div>
        </SendLeftSection>
      }
      tabs={[
        {
          key: "whatsapp",
          label: `WhatsApp to ${contactFirst}`,
          kind: "whatsapp",
          whatsapp: { recipient: contact, phone, body: waBody, time: clockWords(now) },
        },
        {
          key: "email",
          label: `Email to ${contactFirst}`,
          kind: "email",
          email: { from: `${me.name}, Career141 <${me.email}>`, to: to || "No email on file", subject, body },
        },
      ]}
    />
  );
}
