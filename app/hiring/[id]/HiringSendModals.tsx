import PreviewAndSend, { SendLeftSection } from "@/app/ui/PreviewAndSend";
import type { OpsMember } from "@/data/types";
import type { Applicant, Vacancy } from "@/lib/hiring";

/**
 * H2 send · Book an internal interview (Figma 3:12538)
 * H2 send · Offer letter (Figma 3:12720)
 */

export function HiringSendModal({
  send,
  vacancy,
  applicant,
  me,
  closeHref,
}: {
  send: string;
  vacancy: Vacancy;
  applicant: Applicant;
  me: OpsMember;
  closeHref: string;
}) {
  const initials = applicant.name
    .split(/\s+/)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? "")
    .join("");
  const myInitials = me.name
    .split(/\s+/)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? "")
    .join("");

  if (send === "book-internal") {
    const emailBody = `Hi ${applicant.name.split(" ")[0]},\n\nThank you for speaking with us about the ${vacancy.title} role at Career141. We would like to invite you for an interview.\n\nPlease reply to confirm this time works for you.\n\nKind regards,\n${me.name}\nCareer141`;
    const waBody = `Hi ${applicant.name.split(" ")[0]}, this is ${me.name} from Career141. We'd love to book your interview for ${vacancy.title}. Please let me know if this slot works for you.`;

    return (
      <PreviewAndSend
        title={`Book ${applicant.name.split(" ")[0]} · interview`}
        sub={`Career141 > ${vacancy.title}`}
        closeHref={closeHref}
        action={undefined}
        sendLabel="Send invite and message"
        note="Internal Hiring uses sample data right now — copy the WhatsApp or email message to send manually."
        left={
          <>
            <SendLeftSection title="Applicant">
              <div className="rounded-[14px] border border-rule bg-surface px-4 py-3">
                <p className="t-body-m text-ink">{applicant.name}</p>
                <p className="t-small text-ink-3">{applicant.phone || applicant.source}</p>
              </div>
            </SendLeftSection>
            <SendLeftSection title="Interviewer">
              <div className="rounded-[14px] border border-rule bg-surface px-4 py-3">
                <p className="t-body-m text-ink">{applicant.draft?.interviewer || me.name}</p>
                <p className="t-small text-ink-3">{applicant.draft?.place || "Career141 office"}</p>
              </div>
            </SendLeftSection>
          </>
        }
        tabs={[
          {
            key: "invite",
            label: "Invite",
            kind: "invite",
            invite: {
              banner: `Calendar invite from ${me.name}, Career141`,
              dateTag: "Internal interview",
              title: `Interview · ${applicant.name} · ${vacancy.title}`,
              when: "Next available slot (confirm with applicant)",
              where: applicant.draft?.place || "Career141 office / Teams",
              guests: [
                { initials: myInitials, name: me.name, tone: "bg-bg-brand text-brand" },
                { initials, name: applicant.name, tone: "bg-info-soft text-info" },
              ],
            },
            alsoEmail: {
              from: `${me.name}, Career141 <${me.email}>`,
              to: applicant.name,
              subject: `Interview with Career141 — ${vacancy.title}`,
              body: emailBody,
            },
          },
          {
            key: "whatsapp",
            label: `WhatsApp to ${applicant.name.split(" ")[0]}`,
            kind: "whatsapp",
            whatsapp: {
              recipient: applicant.name,
              phone: applicant.phone ?? undefined,
              body: waBody,
            },
          },
        ]}
      />
    );
  }

  if (send === "offer-letter") {
    const body = `Dear ${applicant.name},\n\nWe are pleased to offer you the position of ${vacancy.title} at Career141${applicant.draft?.salary ? ` (${applicant.draft.salary})` : ""}${applicant.draft?.startDate ? `, starting ${applicant.draft.startDate}` : ""}.\n\nPlease review the offer terms and reply to confirm your acceptance.\n\nWelcome aboard,\n${me.name}\nCareer141`;
    return (
      <PreviewAndSend
        title="Send the offer"
        sub={`Career141 > ${vacancy.title}`}
        closeHref={closeHref}
        action={undefined}
        sendLabel="Send offer letter"
        note="Internal Hiring uses sample data right now — edit and copy the offer email below."
        left={
          <SendLeftSection title="The offer">
            <div className="flex flex-col gap-2 rounded-[16px] border border-rule bg-surface p-4 text-[14px]">
              <div className="flex justify-between">
                <span className="text-ink-3">Role</span>
                <span className="font-medium text-ink">{vacancy.title}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-3">Salary</span>
                <span className="font-medium text-ink">{applicant.draft?.salary || "Per offer"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-3">Start date</span>
                <span className="font-medium text-ink">{applicant.draft?.startDate || "To confirm"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-3">Places</span>
                <span className="font-medium text-ink">{vacancy.places}</span>
              </div>
            </div>
          </SendLeftSection>
        }
        tabs={[
          {
            key: "email",
            label: `Email to ${applicant.name.split(" ")[0]}`,
            kind: "email",
            email: {
              from: `${me.name}, Career141 <${me.email}>`,
              to: applicant.name,
              subject: `Offer of Employment — ${vacancy.title} at Career141`,
              body,
              attachments: [{ name: `Offer_Letter_${applicant.name.replace(/\s+/g, "_")}.pdf` }],
            },
          },
        ]}
      />
    );
  }

  return null;
}
