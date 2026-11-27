import Link from "next/link";
import type { ReactNode } from "react";

import { addApplicantCv, bookHiringInterview, decideHiringApplicant, recordHiringCall, recordHiringResult, saveApplicantDetails } from "@/app/actions";
import Icon from "@/app/Icon";
import CopyButton from "@/app/hiring/CopyButton";
import { Avatar, ChoiceGroup, PanelField, panelInput, pillPrimary } from "@/app/ui/figma";
import Panel, { PanelSection } from "@/app/ui/Panel";
import { dayWord } from "@/lib/calendarBoard";
import { CALL_NOT_FIT, NOT_INTERESTED_REASONS, first, inviteMessage, offerLetter, rejectMessage, triesSoFar, whyNow, type Applicant, type Vacancy } from "@/lib/hiring";

export type HiringPanelKind = "call" | "book-interview" | "add-result" | "decide" | "reject" | "cv" | "details";

const small = "t-label inline-flex items-center gap-1.5 rounded-full border border-rule bg-surface px-3 py-[7px] text-ink hover:bg-sunk";

/** "Why now": only what is known about this person and this vacancy. */
function Why({ v, a, now }: { v: Vacancy; a: Applicant; now: number }) {
  return (
    <PanelSection title="Why now">
      <ul className="flex flex-col gap-2">
        {whyNow(v, a, now).map((line) => (
          <li key={line} className="t-body flex gap-2.5 text-ink-2">
            <span className="mt-2 size-1.5 shrink-0 rounded-[3px] bg-warn" />
            {line}
          </li>
        ))}
      </ul>
    </PanelSection>
  );
}

/** "Who and how": the person, the ways to reach them (open the phone or WhatsApp; nothing is sent from here). */
function Who({ a, children, cvHref }: { a: Applicant; children?: ReactNode; cvHref?: string | null }) {
  const digits = (a.phone ?? "").replace(/\D/g, "");
  return (
    <PanelSection title="Who and how">
      <div className="flex items-center gap-3">
        <Avatar name={a.name} size="40" />
        <div className="min-w-0 flex-1">
          <p className="t-body-m">{a.name}</p>
          <p className="t-small text-ink-3">
            {a.stage === "new" || a.stage === "call" ? "Candidate" : "Applicant"} · {a.source}
            {a.phone ? " · " + a.phone : ""}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {digits ? (
          <>
            <a href={`tel:+${digits}`} className={small}>
              <Icon name="phone" size={14} /> Call
            </a>
            <a href={`https://wa.me/${digits}`} target="_blank" rel="noreferrer" className={small}>
              <Icon name="chat" size={14} /> WhatsApp
            </a>
          </>
        ) : (
          <span className="t-small text-ink-3">No phone number on file.</span>
        )}
        {cvHref && (
          <a href={cvHref} target="_blank" rel="noreferrer" className={small}>
            <Icon name="copy" size={14} /> Open the CV
          </a>
        )}
      </div>
      {children}
    </PanelSection>
  );
}

/** A drafted message with its copy button; nothing is sent. With no draft, one line says what is missing. */
function Draft({ label, text, copy, missing }: { label: string; text: string | null; copy: string; missing: string }) {
  return (
    <div className="flex flex-col gap-1.5 pt-1">
      <span className="t-small text-ink-3">{label}</span>
      {text ? (
        <>
          <p className="t-body rounded-[14px] border border-rule px-4 py-3.5 text-ink-2">{text}</p>
          <div>
            <CopyButton text={text} label={copy} />
          </div>
        </>
      ) : (
        <p className="t-small rounded-[14px] bg-sunk px-4 py-3 text-ink-3">{missing}</p>
      )}
    </div>
  );
}

function Save({ happens }: { happens: string }) {
  return (
    <PanelSection title="What happens next">
      <p className="t-body text-ink-2">{happens}</p>
      <div>
        <button type="submit" className={pillPrimary}>
          Save
        </button>
      </div>
    </PanelSection>
  );
}

const textarea = panelInput + " min-h-[72px]";

/** The panels of Internal Hiring, wired to the backend actions. */
export default function HiringPanel({
  kind,
  v,
  a,
  now,
  closeHref,
  cvHref,
  vacancies = [],
  interviewers = [],
  defaultInterviewAt = "",
}: {
  kind: HiringPanelKind;
  v: Vacancy;
  a: Applicant;
  now: number;
  closeHref: string;
  cvHref?: string | null;
  vacancies?: { id: string; title: string }[];
  interviewers?: string[];
  defaultInterviewAt?: string;
}) {
  const name = first(a.name);
  // The details a CV gives and a call adds (23 Nov): NIC, the position applied for, the package they asked for,
  // whether they have a laptop. Every field optional; the vacancy can change, which is how a CV held under "to sort" is placed.
  if (kind === "details") {
    return (
      <Panel kicker="Details" title={`${a.name}'s details`} sub={`${v.title} > Internal Hiring`} closeHref={closeHref}>
        <Who a={a} cvHref={cvHref} />
        <form action={saveApplicantDetails}>
          <input type="hidden" name="vacancyId" value={v.id} />
          <input type="hidden" name="applicantId" value={a.id} />
          <input type="hidden" name="back" value={closeHref} />
          <PanelSection title="From the CV">
            <PanelField label="Phone">
              <input name="phone" defaultValue={a.phone ?? ""} className={panelInput} />
            </PanelField>
            <PanelField label="Email">
              <input name="email" defaultValue={a.email ?? ""} className={panelInput} />
            </PanelField>
            <PanelField label="NIC">
              <input name="nic" defaultValue={a.nic ?? ""} className={panelInput} />
            </PanelField>
            <PanelField label="Position applied for">
              <input name="targetPosition" defaultValue={a.targetPosition ?? ""} className={panelInput} />
            </PanelField>
          </PanelSection>
          <PanelSection title="From the call">
            <PanelField label="Package they ask for">
              <input name="packageSaid" defaultValue={a.expectedSalary || a.packageSaid || ""} className={panelInput} />
            </PanelField>
            <PanelField label="Laptop">
              <select name="laptop" defaultValue={a.laptop ?? ""} className={panelInput}>
                <option value="">Not asked yet</option>
                <option value="Yes">Yes</option>
                <option value="No">No</option>
              </select>
            </PanelField>
          </PanelSection>
          {vacancies.length > 1 && (
            <PanelSection title="Vacancy">
              <PanelField label="Move to">
                <select name="moveTo" defaultValue={v.id} className={panelInput}>
                  {vacancies.map((x) => (
                    <option key={x.id} value={x.id}>
                      {x.title}
                    </option>
                  ))}
                </select>
              </PanelField>
            </PanelSection>
          )}
          <PanelSection title="What happens next">
            <p className="t-body text-ink-2">Saved on the applicant. Nothing is sent to them.</p>
            <button type="submit" className={pillPrimary + " self-start"}>
              Save
            </button>
          </PanelSection>
        </form>
      </Panel>
    );
  }
  // The CV on its own, at any stage (23 Nov): the form used to live only in the call drawer, so a person
  // already past the call had no way to add the CV that was missed.
  if (kind === "cv") {
    return (
      <Panel kicker="CV" title={cvHref ? `Replace ${a.name}'s CV` : `Add ${a.name}'s CV`} sub={`${v.title} > Internal Hiring`} closeHref={closeHref}>
        <Who a={a} cvHref={cvHref} />
        <form action={addApplicantCv} encType="multipart/form-data">
          <input type="hidden" name="vacancyId" value={v.id} />
          <input type="hidden" name="applicantId" value={a.id} />
          <input type="hidden" name="back" value={closeHref} />
          <PanelSection title="CV">
            <input type="file" name="cv" required accept=".pdf,.doc,.docx" aria-label="CV file" className={panelInput} />
            <p className="t-small text-ink-3">A PDF or Word file, up to 10 MB. A new file replaces the old one on the card; the old one stays in Files.</p>
            <div>
              <button type="submit" className={small}>
                {cvHref ? "Replace CV" : "Add CV"}
              </button>
            </div>
          </PanelSection>
        </form>
      </Panel>
    );
  }
  if (kind === "call") {
    const next = triesSoFar(a.stage, a.tries ?? 0) + 1;
    return (
      <Panel kicker="Call" title={`Call ${a.name}`} sub={`${v.title} > Internal Hiring > CV from ${a.source}, ${dayWord(a.since)}`} closeHref={closeHref}>
        <Why v={v} a={a} now={now} />
        <Who a={a} cvHref={cvHref}>
          <div className="flex flex-col gap-1 pt-1">
            <span className="t-small text-ink-3">What to say</span>
            <p className="t-body text-ink-2">Hello {name}, this is Career141. We saw your CV for {v.title}. Do you have 5 minutes for a few questions?</p>
          </div>
        </Who>
        <form action={addApplicantCv} encType="multipart/form-data">
          <input type="hidden" name="vacancyId" value={v.id} />
          <input type="hidden" name="applicantId" value={a.id} />
          <input type="hidden" name="back" value={closeHref} />
          <PanelSection title="CV">
            <input type="file" name="cv" required accept=".pdf,.doc,.docx" aria-label="CV file" className={panelInput} />
            <div>
              <button type="submit" className={small}>
                {cvHref ? "Replace CV" : "Add CV"}
              </button>
            </div>
          </PanelSection>
        </form>
        <form action={recordHiringCall}>
          <input type="hidden" name="vacancyId" value={v.id} />
          <input type="hidden" name="applicantId" value={a.id} />
          <input type="hidden" name="back" value={closeHref} />
          <PanelSection title="Log it here">
            <PanelField label="Call outcome">
              <ChoiceGroup
                name="result"
                label="Call outcome"
                required
                options={[
                  "Scheduled",
                  "Not interested",
                  "Non-responsive",
                  `No answer (try ${Math.min(next, 3)} of 3)`,
                  CALL_NOT_FIT,
                ]}
              />
            </PanelField>
            <PanelField label="If not interested, why">
              <ChoiceGroup
                name="notInterestedReason"
                label="If not interested, why"
                options={[...NOT_INTERESTED_REASONS]}
              />
            </PanelField>
            <PanelField label="Current salary">
              <input name="currentSalary" defaultValue={a.currentSalary ?? ""} placeholder="e.g. LKR 120,000" className={panelInput} />
            </PanelField>
            <PanelField label="Expected salary">
              <input name="expectedSalary" defaultValue={a.expectedSalary ?? a.packageSaid ?? ""} placeholder="e.g. LKR 150,000" className={panelInput} />
            </PanelField>
            <PanelField label="Availability">
              <input name="availability" defaultValue={a.availability ?? ""} placeholder="e.g. Immediate / 1 month notice" className={panelInput} />
            </PanelField>
            {v.checks.length > 0 && (
              <PanelField label={`The ${v.checks.length} checks`}>
                <div className="flex flex-col gap-3">
                  {v.checks.map((c, i) => (
                    <div key={c} className="flex flex-col gap-1.5">
                      <p className="t-body">{c}</p>
                      <ChoiceGroup
                        name={"check" + i}
                        label={c}
                        options={[
                          { value: "ok", label: "OK", tone: "good" },
                          { value: "not-ok", label: "Not OK", tone: "bad" },
                          { value: "not-asked", label: "Not asked" },
                        ]}
                      />
                    </div>
                  ))}
                </div>
              </PanelField>
            )}
            <PanelField label="Note">
              <textarea name="note" className={textarea} placeholder="What you heard (required if Other or Not a fit)" />
            </PanelField>
          </PanelSection>
          <Save happens={`Scheduled: ${name} moves to Scheduled so you can book the leadership interview. Not interested: closes with the reason. No answer: increments tries (3 tries automatically marks Non-responsive).`} />
        </form>
        <Draft label={`Message if ${name} is not a fit`} text={rejectMessage(a, v.title, true)} copy="Copy message" missing="" />
      </Panel>
    );
  }

  if (kind === "reject") {
    return (
      <Panel kicker="Not a fit" title={`Reject ${a.name}`} sub={`Internal Hiring > ${v.title} > Called · fits`} closeHref={closeHref}>
        <Why v={v} a={a} now={now} />
        <Who a={a} cvHref={cvHref} />
        <form action={decideHiringApplicant}>
          <input type="hidden" name="vacancyId" value={v.id} />
          <input type="hidden" name="applicantId" value={a.id} />
          <input type="hidden" name="back" value={closeHref} />
          <input type="hidden" name="decision" value="reject" />
          <PanelSection title="Log it here">
            <PanelField label="The reason">
              <textarea name="reason" required className={textarea} placeholder="Required" />
            </PanelField>
          </PanelSection>
          <Save happens={`${name} moves to Rejected with the reason, and the message below is ready to copy.`} />
        </form>
        <Draft label={`Message for ${name}`} text={rejectMessage(a, v.title, true)} copy="Copy message" missing="" />
      </Panel>
    );
  }

  if (kind === "book-interview") {
    const invite = inviteMessage(a, v.title);
    return (
      <Panel kicker="Book an interview" title={`Book ${a.name}`} sub={`Internal Hiring > ${v.title} > Called · fits`} closeHref={closeHref}>
        <Why v={v} a={a} now={now} />
        <Who a={a}>
          <div className="pt-1">
            <Link href={`/hiring/${v.id}?send=book-internal&on=${a.id}`} scroll={false} className={small}>
              <Icon name="send" size={14} /> Preview and send
            </Link>
          </div>
          <Draft label="Invite message" text={invite} copy="Copy invite" missing="Book the interview below to generate the invite message and place it on the Calendar." />
        </Who>
        <form action={bookHiringInterview}>
          <input type="hidden" name="vacancyId" value={v.id} />
          <input type="hidden" name="applicantId" value={a.id} />
          <input type="hidden" name="back" value={closeHref} />
          <PanelSection title="Log it here">
            <PanelField label="Date and time (Colombo — defaults to next working day 16:00)">
              <input type="datetime-local" name="interviewAt" defaultValue={defaultInterviewAt} required className={panelInput} />
            </PanelField>
            <PanelField label="Interviewer (leadership)">
              {interviewers.length > 0 ? (
                <select name="interviewer" defaultValue={interviewers[0]} className={panelInput}>
                  {interviewers.map((person) => (
                    <option key={person} value={person}>
                      {person}
                    </option>
                  ))}
                </select>
              ) : (
                <input name="interviewer" defaultValue="" placeholder="Who is interviewing?" className={panelInput} />
              )}
            </PanelField>
            <PanelField label="Place">
              <ChoiceGroup name="place" label="Place" required options={["Office", "Online"]} value="Office" />
            </PanelField>
          </PanelSection>
          <Save happens={`The time goes on the Calendar under Internal interviews, ${name} moves to Interview, and if ${name}'s email is on file, the interview email is drafted for approval.`} />
        </form>
      </Panel>
    );
  }

  if (kind === "add-result") {
    return (
      <Panel kicker="Add the result" title={`Result for ${a.name}`} sub={`Internal Hiring > ${v.title} > Interview`} closeHref={closeHref}>
        <Why v={v} a={a} now={now} />
        <Who a={a}>
          <div className="flex flex-col gap-1 pt-1">
            <span className="t-small text-ink-3">What to note</span>
            <p className="t-body text-ink-2">The skills the role needs, how {name} spoke, and anything to check before a decision.</p>
          </div>
        </Who>
        <form action={recordHiringResult}>
          <input type="hidden" name="vacancyId" value={v.id} />
          <input type="hidden" name="applicantId" value={a.id} />
          <input type="hidden" name="back" value={closeHref} />
          <PanelSection title="Log it here">
            <PanelField label="Result">
              <ChoiceGroup name="result" label="Result" required options={["Pass", "Hold", "Fail"]} />
            </PanelField>
            <PanelField label="If fail, the reason">
              <textarea name="reason" className={textarea} placeholder="Required if Fail" />
            </PanelField>
            <PanelField label="Score out of 5">
              <ChoiceGroup name="score" label="Score" options={["1", "2", "3", "4", "5"]} />
            </PanelField>
            <PanelField label="Notes">
              <textarea name="notes" className={textarea} placeholder="Key observations from the interview" />
            </PanelField>
          </PanelSection>
          <Save happens={`Pass: ${name} moves to Shortlisted. Fail: ${name} moves to Rejected with the reason, and the message below is ready to copy.`} />
        </form>
        <Draft label={`Message if ${name} fails`} text={rejectMessage(a, v.title)} copy="Copy message" missing="" />
      </Panel>
    );
  }

  const offer = offerLetter(a, v.title);
  const isOffered = a.stage === "offered";
  return (
    <Panel kicker="Shortlisted & offered" title={isOffered ? `Offer outcome for ${name}` : `Decide on ${name}`} sub={`Internal Hiring > ${v.title}`} closeHref={closeHref}>
      <Why v={v} a={a} now={now} />
      <Who a={a}>
        <div className="flex flex-col gap-1 pt-1">
          <span className="t-small text-ink-3">Interview notes</span>
          <p className="t-body text-ink-2">{a.detail || "Shortlisted after interview."}</p>
        </div>
      </Who>
      <form action={decideHiringApplicant}>
        <input type="hidden" name="vacancyId" value={v.id} />
        <input type="hidden" name="applicantId" value={a.id} />
        <input type="hidden" name="back" value={closeHref} />
        <PanelSection title="Log it here">
          <PanelField label="Your decision">
            <ChoiceGroup
              name="decision"
              label="Your decision"
              required
              options={isOffered ? ["Accept", "Decline", "Hold"] : ["Offer", "Accept", "Hold", "Reject"]}
            />
          </PanelField>
          <input name="start" defaultValue={a.draft?.startDate ?? ""} className={panelInput} placeholder="Start date (e.g. 1 Dec 2026)" aria-label="Start date" />
          <input name="salary" defaultValue={a.draft?.salary ?? a.expectedSalary ?? ""} className={panelInput} placeholder="Salary (e.g. LKR 150,000)" aria-label="Salary" />
          <textarea name="reason" className={textarea} placeholder="If declined or rejected, the reason (required)" aria-label="Reason to reject or decline" />
        </PanelSection>
        <Save happens={`Offer: moves ${name} to Offered. Accept: marks ${name} hired and increments filled to ${v.filled + 1} of ${v.places}. Decline or Reject requires a reason.`} />
      </form>
      <div className="pb-2">
        <Link href={`/hiring/${v.id}?send=offer-letter&on=${a.id}`} scroll={false} className={small}>
          <Icon name="send" size={14} /> Preview offer letter
        </Link>
      </div>
      <Draft label="Offer letter" text={offer} copy="Copy offer letter" missing="Save Hire with a start date and salary above to generate the offer letter." />
    </Panel>
  );
}
