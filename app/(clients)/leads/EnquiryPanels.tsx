import Link from "next/link";

import {
  bookIntroCall,
  checkLeadDuplicate,
  chooseLeadMatch,
  decideLeadIndustry,
  markMeetingHeld,
  markMeetingNotHeld,
  sendAgreement,
} from "@/app/actions";
import Icon from "@/app/Icon";
import { AgreementFieldsForm } from "@/app/(clients)/leads/[id]/AgreementFieldsForm";
import { CoverEmailPreview } from "@/app/(clients)/leads/[id]/CoverEmailPreview";
import { MeetingBookingForm } from "@/app/(clients)/leads/[id]/MeetingBookingForm";
import { Avatar, pillPrimary, pillSecondary, panelInput } from "@/app/ui/figma";
import { AgreementVersions, DraftDocument } from "@/app/ui/AgreementVersions";
import { KeepFields } from "@/app/ui/KeepFields";
import { MeetingOutcome } from "@/app/ui/MeetingOutcome";
import Panel, { PanelSection } from "@/app/ui/Panel";
import { SubmitButton } from "@/app/ui/SubmitButton";
import type { OpsDatabase, OpsEsa, OpsLead, OpsMeeting, OpsMember } from "@/data/types";
import { agreementVersions, coverEmail, missingFields, nextDraftVersion } from "@/lib/esa";
import { safeName } from "@/lib/files";
import { type EnquiryCard, clockWords, dayWords } from "@/lib/clientsView";
import { SOURCE_MEANINGS } from "@/lib/leads";
import { MAX_REBOOKS } from "@/lib/meetings";
import { waLink } from "../parts";
import CopyButton from "../CopyButton";

const small = " !px-4 !py-[7px] !text-[12px]";

function Why({ lines }: { lines: string[] }) {
  return (
    <PanelSection title="Why now">
      <ul className="flex flex-col gap-3">
        {lines.map((w, i) => (
          <li key={i} className="t-body flex items-start gap-3 text-ink-2">
            <span aria-hidden="true" className="mt-2 size-1.5 shrink-0 rounded-[3px] bg-warn" />
            {w}
          </li>
        ))}
      </ul>
    </PanelSection>
  );
}

function Who({ name, line, phone, email, children }: { name: string; line: string; phone?: string; email?: string; children?: React.ReactNode }) {
  const wa = waLink(phone);
  return (
    <PanelSection title="Who and how">
      <div className="flex items-center gap-3">
        <Avatar name={name} size="40" tone="neutral" />
        <div className="flex min-w-0 flex-col">
          <span className="t-body-m">{name}</span>
          <span className="t-small text-ink-3">{line}</span>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {phone && (
          <a href={"tel:" + phone.replace(/\s/g, "")} className={pillSecondary + small}>
            <Icon name="phone" size={14} />
            Call
          </a>
        )}
        {wa && (
          <a href={wa} target="_blank" rel="noreferrer" className={pillSecondary + small}>
            <Icon name="chat" size={14} />
            WhatsApp
          </a>
        )}
        {email && (
          <a href={"mailto:" + email} className={pillSecondary + small}>
            <Icon name="mail" size={14} />
            Email
          </a>
        )}
      </div>
      {children}
    </PanelSection>
  );
}

const sourceName = (lead: OpsLead) => SOURCE_MEANINGS[lead.source as keyof typeof SOURCE_MEANINGS] ?? lead.source;
const hidden = (leadId: string, back: string) => (
  <>
    <input type="hidden" name="leadId" value={leadId} />
    <input type="hidden" name="back" value={back} />
  </>
);

/** C2 "Check the enquiry" (180:261): the two checks - is it a company we have, is it banking or finance - each answered with a button. */
export function CheckEnquiryPanel({ lead, card, close, mayManage }: { lead: OpsLead; card: EnquiryCard; close: string; mayManage: boolean }) {
  const flagged = lead.industryFlagged && !lead.industryConfirmedBy;
  const m = card.match;
  const why = [
    "The enquiry came in by " + sourceName(lead).toLowerCase() + ", " + dayWords(lead.createdAt),
    m ? "The name looks like " + m.name + ", a client since " + new Date(m.since).getUTCFullYear() : "No client of ours has a name like it",
    flagged ? "Banking and finance firms are not our clients" + (lead.industryBecause ? " (it says " + lead.industryBecause + ")" : "") : "Nothing in the name points to banking or finance",
  ];
  return (
    <Panel kicker="Check the enquiry" title={"Check the enquiry from " + lead.company} sub={["Enquiries", lead.company, sourceName(lead)].join(" > ")} closeHref={close}>
      <Why lines={why} />
      <Who name={lead.company} line={[sourceName(lead), lead.contactEmail || lead.contactPhone].filter(Boolean).join(" · ")} />
      <PanelSection title="Checks">
        <ul className="t-body flex flex-col gap-3 text-ink-2">
          <li>{m ? "Same company as " + m.name + "?" : "Is it a company the TA System already has?"}</li>
          <li>Banking or finance?</li>
          <li>Agreement already on file?</li>
        </ul>
      </PanelSection>
      {mayManage ? (
        <>
          <PanelSection title="Log it here">
            <span className="t-small text-ink-3">Company</span>
            <div className="flex flex-wrap gap-2">
              {m && (
                <form action={chooseLeadMatch}>
                  {hidden(lead.id, close)}
                  <input type="hidden" name="taClientId" value={m.taClientId ?? ""} />
                  <button type="submit" disabled={!m.taClientId} className={pillSecondary + small + " disabled:opacity-50"} title={m.taClientId ? undefined : "Not linked to a TA client yet"}>
                    Same company as {m.name}
                  </button>
                </form>
              )}
              <form action={checkLeadDuplicate}>
                {hidden(lead.id, close)}
                <button type="submit" className={pillSecondary + small}>
                  {m ? "New company: ask the TA System" : "Ask the TA System"}
                </button>
              </form>
            </div>
            <span className="t-small pt-2 text-ink-3">Sector</span>
            <div className="flex flex-wrap gap-2">
              {flagged ? (
                <>
                  <form action={decideLeadIndustry}>
                    {hidden(lead.id, close)}
                    <input type="hidden" name="decision" value="clear" />
                    <button type="submit" className={pillSecondary + small}>
                      Clear
                    </button>
                  </form>
                  <form action={decideLeadIndustry}>
                    {hidden(lead.id, close)}
                    <input type="hidden" name="decision" value="confirm" />
                    <button type="submit" className={pillSecondary + small}>
                      Banking or finance (decline)
                    </button>
                  </form>
                </>
              ) : (
                <span className="t-label inline-flex items-center gap-1.5 rounded-full bg-sunk px-4 py-[7px] text-ink-2">
                  <Icon name="check" size={14} />
                  Clear
                </span>
              )}
            </div>
          </PanelSection>
          <PanelSection title="What happens next">
            <p className="t-body text-ink-2">Asking the TA System links a company we already have, or says it is new. Clear: the intro call is next. Banking or finance: the lead is declined and never invited back.</p>
          </PanelSection>
        </>
      ) : (
        <PanelSection>
          <p className="t-body text-ink-2">Only somebody who manages clients can answer the checks.</p>
        </PanelSection>
      )}
    </Panel>
  );
}

/** G5 "Duplicate check" (145:210): the client the name matches, and the choice between using it and saying it is someone else. */
export function DuplicatePanel({ lead, card, close, mayManage }: { lead: OpsLead; card: EnquiryCard | null; close: string; mayManage: boolean }) {
  const m = card?.match ?? null;
  return (
    <Panel kicker="Duplicate check" title={m ? lead.company + " may already be ours" : "No client has this name"} closeHref={close}>
      <p className="t-body pb-[18px] text-ink-2">
        {m ? "Two client records for one company is how the same company gets two owners and two agreements. Say whether this is the same one." : "Nothing on our client list looks like this name. The TA System is asked when you run the check."}
      </p>
      {m && (
        <div className="flex items-center gap-3 border-t border-rule py-[18px]">
          <Avatar name={m.name} />
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="t-body-m">{m.name}</span>
            <span className="t-small text-ink-faint">Client since {new Date(m.since).getUTCFullYear()}</span>
          </div>
        </div>
      )}
      {mayManage && (
        <div className="flex flex-wrap gap-3 border-t border-rule pt-[18px]">
          {m && (
            <form action={chooseLeadMatch}>
              {hidden(lead.id, close)}
              <input type="hidden" name="taClientId" value={m.taClientId ?? ""} />
              <button type="submit" disabled={!m.taClientId} className={pillPrimary + " disabled:opacity-50"} title={m.taClientId ? undefined : "Not linked to a TA client yet"}>
                Use the same person
              </button>
            </form>
          )}
          <form action={checkLeadDuplicate}>
            {hidden(lead.id, close)}
            <button type="submit" className={m ? pillSecondary : pillPrimary}>
              {m ? "It is someone else: ask the TA System" : "Ask the TA System"}
            </button>
          </form>
        </div>
      )}
    </Panel>
  );
}

/** C2 "Intro call" (180:333): book it, or say whether it was held and write what was said. */
export function IntroCallPanel({
  lead,
  meetings,
  esa,
  close,
  mayManage,
  members,
  taPeople,
  teamsOn,
  startFields,
}: {
  lead: OpsLead;
  meetings: OpsMeeting[];
  esa: OpsEsa | null;
  close: string;
  mayManage: boolean;
  members: Pick<OpsMember, "id" | "name">[];
  taPeople: { id: string; fullName: string }[];
  teamsOn: boolean;
  startFields: Record<string, string>;
}) {
  const intro = meetings.filter((m) => m.kind === "intro");
  const booked = intro.find((m) => m.state === "booked") ?? null;
  const held = intro.some((m) => m.state === "held");
  const tried = intro.reduce((n, m) => Math.max(n, m.rebookCount), 0);
  const why = [
    booked ? "The call is booked for " + dayWords(booked.at) + ", " + clockWords(booked.at) : held ? "The call was held" : "The call is not booked yet",
    esa ? "The agreement is " + esa.state : "No agreement details yet",
    "Up to " + Math.max(0, MAX_REBOOKS - tried) + " tries to rebook if they miss it",
  ];
  return (
    <Panel kicker="Intro call" title={"Intro call with " + lead.company} sub={["Enquiries", lead.company, "Intro call"].join(" > ")} closeHref={close}>
      <Why lines={why} />
      <Who name={lead.contactName || lead.company} line={"Contact on the enquiry" + (lead.contactPhone ? " · " + lead.contactPhone : "")} phone={lead.contactPhone} email={lead.contactEmail} />
      {mayManage && (
        <PanelSection title="Log it here">
          {booked && (
            <MeetingOutcome
              meetingId={booked.id}
              held={
                <form action={markMeetingHeld} className="flex flex-col gap-3">
                  <KeepFields id="meeting-held" />
                  <input type="hidden" name="meetingId" value={booked.id} />
                  <span className="t-small text-ink-3">What did they say?</span>
                  <textarea name="brief" rows={3} required placeholder="Brief from the call (required)" className={panelInput} />
                  <span className="t-small text-ink-3">Package and role</span>
                  <input name="role" placeholder="Role asked" className={panelInput} />
                  <input name="packageSaid" placeholder="Package mentioned" className={panelInput} />
                  <SubmitButton id={"held-" + booked.id} answerAt="call-held" className={pillPrimary + " self-start"}>
                    It was held
                  </SubmitButton>
                </form>
              }
              notHeld={
                <form action={markMeetingNotHeld} className="flex flex-col gap-3">
                  <input type="hidden" name="meetingId" value={booked.id} />
                  <KeepFields id="meeting-not-held" />
                  <span className="t-small text-ink-3">
                    Why did it not happen? (rebook {tried + 1} of {MAX_REBOOKS})
                  </span>
                  <input name="reason" required placeholder="Reason it was not held" className={panelInput} />
                  <label className="t-small flex items-center gap-2 text-ink">
                    <input type="checkbox" name="clientReplied" />
                    The client is still answering us
                  </label>
                  <SubmitButton id={"not-held-" + booked.id} className={pillSecondary + " self-start"}>
                    It was not held
                  </SubmitButton>
                </form>
              }
            />
          )}
          {!booked && !held && (
            <MeetingBookingForm
              action={bookIntroCall}
              leadId={lead.id}
              contact={{ name: lead.contactName, email: lead.contactEmail }}
              taPeople={taPeople}
              members={members as { id: string; name: string }[]}
              organiserId={lead.ownerId}
              teamsOn={teamsOn}
              submitLabel={intro.length ? "Book it again" : "Book the intro call"}
              primary
              offerAlsoRequirement
            />
          )}
          {held && (
            <>
              <p className="t-body text-ink-2">The call was held. Write the agreement details from it, then send the agreement.</p>
              <AgreementFieldsForm leadId={lead.id} esa={esa ?? { id: "", fields: startFields }} returnTo="intro" />
            </>
          )}
        </PanelSection>
      )}
      <PanelSection title="What happens next">
        <p className="t-body text-ink-2">{held ? "The agreement draft is made, ready to send." : "Held: the agreement clock starts, two hours by the settings. Not held: it is rebooked, and the third miss closes the lead."}</p>
      </PanelSection>
    </Panel>
  );
}

/** C2 "Send the agreement" (180:425): the details, the cover email, and the send - which drafts for approval, never sends by itself. */
export function SendAgreementPanel({
  lead,
  esa,
  db,
  close,
  mayManage,
  startFields,
  esaTemplate,
}: {
  lead: OpsLead;
  esa: OpsEsa | null;
  db: OpsDatabase;
  close: string;
  mayManage: boolean;
  startFields: Record<string, string>;
  esaTemplate: boolean;
}) {
  const heldIntro = db.meetings.filter((m) => m.leadId === lead.id && m.kind === "intro" && m.state === "held").sort((a, b) => (b.heldAt ?? 0) - (a.heldAt ?? 0))[0];
  const files = esa ? db.files.filter((f) => (f.subjectType === "esa" && f.subjectId === esa.id) || f.id === esa.signedFileId || f.id === esa.countersignedFileId) : [];
  const newest = esa ? (agreementVersions(files)[0] ?? null) : null;
  const wording = db.templates.find((t) => t.key === "esa.cover") ?? null;
  const cover = esa ? coverEmail(wording, esa.fields) : null;
  const blanks = esa ? missingFields(esa.fields) : [];
  const f = esa?.fields ?? startFields;
  const signer = f.signatoryName || lead.contactName || lead.company;
  const why = [
    heldIntro?.heldAt ? "The intro call was held on " + dayWords(heldIntro.heldAt).replace(/^\w+ /, "") : "The intro call is done or not needed",
    esa ? "The agreement draft is " + (newest ? "ready and has not been sent" : "started: " + (blanks.length ? blanks.length + " fields are still blank" : "make the draft")) : "The agreement is not started",
    "Every day it waits delays the first role",
  ];
  return (
    <Panel kicker="Send the agreement" title={"Send the agreement to " + lead.company} sub={[lead.company, "Agreement v" + (esa?.version ?? 1)].join(" > ")} closeHref={close}>
      <Why lines={why} />
      <Who name={signer} line={"Signatory" + (f.signatoryPhone ? " · " + f.signatoryPhone : "")} phone={f.signatoryPhone} email={f.signatoryEmail}>
        <div className="flex flex-wrap items-center gap-2">
          <Link href={"/leads?send=send-agreement&on=" + lead.id} scroll={false} className={pillSecondary + " !px-4 !py-[7px] !text-[12px]"}>
            <Icon name="send" size={14} />
            Preview and send
          </Link>
        </div>
        {newest && <DraftDocument file={newest.file} version={newest.version} />}
      </Who>
      {mayManage ? (
        <>
          <PanelSection title="Agreement details">
            {!esaTemplate && <p className="t-small text-warn">The ESA template is not uploaded yet, so a draft cannot be made. Add it on Files as Agreement, drafted.</p>}
            <AgreementFieldsForm leadId={lead.id} esa={esa ?? { id: "", fields: startFields }} returnTo="intro" />
            {esa && <AgreementVersions esa={esa} files={files} />}
          </PanelSection>
          {esa && cover && (
            <PanelSection title="Cover email">
              <CoverEmailPreview
                esaId={esa.id}
                to={String(esa.fields.signatoryEmail ?? "").trim()}
                attachment={"Agreement - " + safeName(String(esa.fields.companyName ?? "client")) + " - v" + nextDraftVersion(files) + ".pdf"}
                email={cover}
                edited={!!(esa.fields.coverSubject && esa.fields.coverBody)}
                returnTo="intro"
              />
              {!("problem" in cover) && (
                <div>
                  <CopyButton text={cover.body} label="Copy the email" tone="pill" />
                </div>
              )}
            </PanelSection>
          )}
          {esa && (
            <PanelSection title="Log it here">
              <form action={sendAgreement} className="flex flex-col gap-3">
                <input type="hidden" name="esaId" value={esa.id} />
                <input type="hidden" name="returnTo" value="intro" />
                <p className="t-body text-ink-2">Makes the final PDF from these details and drafts the email with it attached, for you to approve. Nothing reaches the client until a person approves it.</p>
                <SubmitButton id="send-esa" className={pillPrimary + " self-start"}>
                  Send the agreement
                </SubmitButton>
              </form>
            </PanelSection>
          )}
        </>
      ) : (
        <PanelSection>
          <p className="t-body text-ink-2">Only somebody who manages clients can send an agreement.</p>
        </PanelSection>
      )}
      <PanelSection title="What happens next">
        <p className="t-body text-ink-2">The chase ladder starts when it goes: six steps, the first due in 2 days. Any reply from the client stops it.</p>
        <Link href={close} scroll={false} replace className="t-body-m text-brand hover:underline">
          Close
        </Link>
      </PanelSection>
    </Panel>
  );
}
