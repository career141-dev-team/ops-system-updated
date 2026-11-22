import Link from "next/link";
import type { ReactNode } from "react";

import { addApplicantCv, bookHiringInterview,decideHiringApplicant, recordHiringCall, recordHiringResult } from "@/app/actions";
import Icon from "@/app/Icon";
import CopyButton from "@/app/hiring/CopyButton";
import { Avatar, ChoiceGroup, PanelField, panelInput, pillPrimary } from "@/app/ui/figma";
import Panel, { PanelSection } from "@/app/ui/Panel";
import { dayWord } from "@/lib/calendarBoard";
import { CALL_NOT_FIT, first, inviteMessage, offerLetter, rejectMessage, whyNow, type Applicant, type Vacancy } from "@/lib/hiring";

export type HiringPanelKind = "call" | "book-interview" | "add-result" | "decide" | "reject";

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

/** The four panels of H2, wired to the internal hiring backend actions. */
export default function HiringPanel({ kind, v, a, now, closeHref, cvHref }: { kind: HiringPanelKind; v: Vacancy; a: Applicant; now: number; closeHref: string; cvHref?: string | null }) {
  const name = first(a.name);
  if (kind === "call") {
    const next = (a.tries ?? 0) + 1;
    return (
      <Panel kicker="Call" title={`Call ${a.name}`} sub={`${v.title} > Internal hiring > CV from ${a.source}, ${dayWord(a.since)}`} closeHref={closeHref}>
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
            <PanelField label="Call result">
              <ChoiceGroup name="result" label="Call result" required options={["Talked", CALL_NOT_FIT, `No answer (try ${Math.min(next, 3)} of 3)`, "Call back on..."]} />
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
              <textarea name="note" className={textarea} placeholder="What you heard (the reason, if not a fit)" />
            </PanelField>
          </PanelSection>
          <Save happens={`Talked: ${name} moves to Called · fits so you can book the interview. Not a fit: ${name} moves to Rejected with your note as the reason, and no interview is booked. No answer: increments the try counter and keeps them in To call.`} />
        </form>
        <Draft label={`Message if ${name} is not a fit`} text={rejectMessage(a, v.title, true)} copy="Copy message" missing="" />
      </Panel>
    );
  }

  if (kind === "reject") {
    return (
      <Panel kicker="Not a fit" title={`Reject ${a.name}`} sub={`Internal hiring > ${v.title} > Called · fits`} closeHref={closeHref}>
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
      <Panel kicker="Book an interview" title={`Book ${a.name}`} sub={`Internal hiring > ${v.title} > Called · fits`} closeHref={closeHref}>
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
            <PanelField label="Date and time">
              <input type="datetime-local" name="interviewAt" required className={panelInput} />
            </PanelField>
            <PanelField label="Interviewer">
              <input name="interviewer" defaultValue="" placeholder="Who is interviewing?" className={panelInput} />
            </PanelField>
            <PanelField label="Place">
              <ChoiceGroup name="place" label="Place" required options={["Office", "Online"]} value="Office" />
            </PanelField>
          </PanelSection>
          <Save happens={`The time goes on the Calendar under Internal interviews, and ${name} moves to Interview.`} />
        </form>
      </Panel>
    );
  }

  if (kind === "add-result") {
    return (
      <Panel kicker="Add the result" title={`Result for ${a.name}`} sub={`Internal hiring > ${v.title} > Interview`} closeHref={closeHref}>
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
          <Save happens={`Pass: ${name} moves to Decision. Fail: ${name} moves to Rejected with the reason, and the message below is ready to copy.`} />
        </form>
        <Draft label={`Message if ${name} fails`} text={rejectMessage(a, v.title)} copy="Copy message" missing="" />
      </Panel>
    );
  }

  const offer = offerLetter(a, v.title);
  return (
    <Panel kicker="Decide" title={`Decide on ${name}`} sub={`Internal hiring > ${v.title} > Decision`} closeHref={closeHref}>
      <Why v={v} a={a} now={now} />
      <Who a={a}>
        <div className="flex flex-col gap-1 pt-1">
          <span className="t-small text-ink-3">Interview notes</span>
          <p className="t-body text-ink-2">{a.detail || "Passed interview."}</p>
        </div>
      </Who>
      <form action={decideHiringApplicant}>
        <input type="hidden" name="vacancyId" value={v.id} />
        <input type="hidden" name="applicantId" value={a.id} />
        <input type="hidden" name="back" value={closeHref} />
        <PanelSection title="Log it here">
          <PanelField label="Your decision">
            <ChoiceGroup name="decision" label="Your decision" required options={["Hire", "Hold", "Reject"]} />
          </PanelField>
          <input name="start" className={panelInput} placeholder="Start date (e.g. 1 Dec 2026)" aria-label="Start date" />
          <input name="salary" className={panelInput} placeholder="Salary (e.g. LKR 150,000)" aria-label="Salary" />
          <textarea name="reason" className={textarea} placeholder="If reject, the reason (required)" aria-label="Reason to reject" />
        </PanelSection>
        <Save happens={`Hire: the offer letter is ready to copy, and the vacancy shows ${v.filled + 1} of ${v.places} places filled. Hold keeps ${name} in Decision. Reject asks for the reason first.`} />
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
