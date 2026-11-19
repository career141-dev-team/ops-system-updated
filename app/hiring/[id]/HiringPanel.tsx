import Link from "next/link";
import type { ReactNode } from "react";

import Icon from "@/app/Icon";
import CopyButton from "@/app/hiring/CopyButton";
import { Avatar, ChoiceGroup, PanelField, panelInput, pillPrimary } from "@/app/ui/figma";
import Panel, { PanelSection } from "@/app/ui/Panel";
import { clockOf, dayWord } from "@/lib/calendarBoard";
import { HIRING_BACKEND_GAPS, first, inviteMessage, offerLetter, rejectMessage, whyNow, type Applicant, type Vacancy } from "@/lib/hiring";

export type HiringPanelKind = "call" | "book-interview" | "add-result" | "decide";

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
function Who({ a, children, cv }: { a: Applicant; children?: ReactNode; cv?: boolean }) {
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
        {cv && (
          <button type="button" disabled title="Not connected yet: the applicant's CV file is not stored." className={small + " opacity-50"}>
            <Icon name="copy" size={14} /> Open the CV
          </button>
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
    </PanelSection>
  );
}

function SaveButton() {
  return (
    <div className="flex flex-col items-start gap-2">
      <button type="button" disabled className={pillPrimary + " opacity-40 cursor-not-allowed"}>
        Save
      </button>
      <p className="t-small text-ink-3">Not connected yet: {HIRING_BACKEND_GAPS} are not stored, so this cannot save.</p>
    </div>
  );
}

const textarea = panelInput + " min-h-[72px]";

/** The four panels of H2. Every form is switched off: there is no backend to save into. */
export default function HiringPanel({ kind, v, a, now, closeHref }: { kind: HiringPanelKind; v: Vacancy; a: Applicant; now: number; closeHref: string }) {
  const name = first(a.name);
  if (kind === "call") {
    const next = (a.tries ?? 0) + 1;
    return (
      <Panel kicker="Call" title={`Call ${a.name}`} sub={`${v.title} > Internal hiring > CV from ${a.source}, ${dayWord(a.since)}`} closeHref={closeHref}>
        <Why v={v} a={a} now={now} />
        <Who a={a} cv>
          <div className="flex flex-col gap-1 pt-1">
            <span className="t-small text-ink-3">What to say</span>
            <p className="t-body text-ink-2">Hello {name}, this is Career141. We saw your CV for {v.title}. Do you have 5 minutes for a few questions?</p>
          </div>
        </Who>
        <PanelSection title="Log it here">
          <fieldset disabled className="flex flex-col gap-4">
            <PanelField label="Call result">
              <ChoiceGroup name="result" label="Call result" options={["Talked", `No answer (try ${Math.min(next, 3)} of 3)`, "Call back on..."]} />
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
              <textarea name="note" className={textarea} placeholder="What you heard" />
            </PanelField>
          </fieldset>
        </PanelSection>
        <Save happens={`Fits: ${name} goes to Called, fits, and you book the interview. Does not fit: pick a reason and copy the message. No answer: the next try is set and a WhatsApp message is ready to copy.`} />
        <SaveButton />
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
          <Draft label="Invite message" text={invite} copy="Copy invite" missing="The invite is written once an interview time, a person and a place are chosen. Not connected yet: those are not stored." />
        </Who>
        <PanelSection title="Log it here">
          <fieldset disabled className="flex flex-col gap-4">
            {(v.freeTimes ?? []).map((f) => (
              <PanelField key={f.who + f.round} label={`${f.who} is free · ${f.round}`}>
                <ChoiceGroup name={"time-" + f.who} label={`${f.who} free times`} options={f.times.map((t) => dayWord(t) + " " + clockOf(t))} />
              </PanelField>
            ))}
            {!v.freeTimes?.length && <p className="t-small text-ink-3">Not connected yet: the interviewers&apos; free times are not stored.</p>}
            <PanelField label="Place">
              <ChoiceGroup name="place" label="Place" options={["Office", "Online"]} />
            </PanelField>
          </fieldset>
        </PanelSection>
        <Save happens={`The time goes on the calendar. ${name} and the interviewer get a reminder the day before. ${name} moves to Interview.`} />
        <SaveButton />
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
        <PanelSection title="Log it here">
          <fieldset disabled className="flex flex-col gap-4">
            <PanelField label="Result">
              <ChoiceGroup name="result" label="Result" options={["Pass", "Hold", "Fail"]} />
            </PanelField>
            <PanelField label="If fail, the reason">
              <textarea name="reason" className={textarea} />
            </PanelField>
            <PanelField label="Score out of 5">
              <ChoiceGroup name="score" label="Score" options={["1", "2", "3", "4", "5"]} />
            </PanelField>
            <PanelField label="Notes">
              <textarea name="notes" className={textarea} />
            </PanelField>
          </fieldset>
        </PanelSection>
        <Save happens={`Pass: ${name} moves to Decision. Fail: ${name} moves to Rejected with the reason, and the message below is ready to copy.`} />
        <Draft label={`Message if ${name} fails`} text={rejectMessage(a, v.title)} copy="Copy message" missing="" />
        <SaveButton />
      </Panel>
    );
  }

  const offer = offerLetter(a, v.title);
  return (
    <Panel kicker="Decide" title={`Decide on ${name}`} sub={`Internal hiring > ${v.title} > Decision`} closeHref={closeHref}>
      <Why v={v} a={a} now={now} />
      <Who a={a}>
        <div className="flex flex-col gap-1 pt-1">
          <span className="t-small text-ink-3">What the interviewers said</span>
          <p className="t-body text-ink-2">Not connected yet: interview results are not stored, so what the interviewers said cannot be shown here.</p>
        </div>
      </Who>
      <PanelSection title="Log it here">
        <fieldset disabled className="flex flex-col gap-4">
          <PanelField label="Your decision">
            <ChoiceGroup name="decision" label="Your decision" options={["Hire", "Hold", "Reject"]} />
          </PanelField>
          <input name="start" className={panelInput} placeholder="Start date" aria-label="Start date" />
          <input name="salary" className={panelInput} placeholder="Salary" aria-label="Salary" />
          <textarea name="reason" className={textarea} placeholder="If reject, the reason" aria-label="Reason to reject" />
        </fieldset>
      </PanelSection>
      <Save happens={`Hire: the offer letter is ready to copy, and the vacancy shows ${v.filled + 1} of ${v.places} places filled. Hold keeps ${name} in Decision. Reject asks for the reason first.`} />
      <div className="pb-2">
        <Link href={`/hiring/${v.id}?send=offer-letter&on=${a.id}`} scroll={false} className={small}>
          <Icon name="send" size={14} /> Preview offer letter
        </Link>
      </div>
      <Draft label="Offer letter" text={offer} copy="Copy offer letter" missing="The offer letter is written once a start date, a salary and a reply-by date are set. Not connected yet: they are not stored." />
      <SaveButton />
    </Panel>
  );
}
