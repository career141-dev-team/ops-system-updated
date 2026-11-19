import {
  approveAndSend,
  bookInterview,
  markInterviewAttendance,
  recordCandidateFeedbackByHand,
  recordCandidateOut,
  recordCandidatePick,
  recordCandidateReconfirm,
  recordClientBooking,
  recordInterviewSlots,
  recordReferenceDecision,
  recordReferenceReport,
  recordRoundDecision,
  recordSlotAnswers,
  relayReference,
  requestInterviewSlots,
  requestReference,
} from "@/app/actions";
import { ChoiceGroup, EmptyState, PanelField, panelInput, pillPrimary, pillSecondary } from "@/app/ui/figma";
import Panel, { PanelSection } from "@/app/ui/Panel";
import { referenceForApplication } from "@/data/desk";
import { contactsFor } from "@/lib/contacts";
import { ROUND_DECISIONS, chosenSlot, slotAnswerFor } from "@/lib/interviews";
import { panelHref, closeHref } from "@/lib/panel";
import { clientBooksText, confirmationText, dayWords, localInput, reconfirmText, slotWords } from "@/lib/roleInterviews";

import type { TabProps } from "../ctx";
import { Chooser, MessageBox, Next, Person, WhyNow } from "./parts";

type Iv = TabProps["c"]["itsInterviews"][number];

/** The panel names the other packages link to. */
export const INTERVIEW_PANELS = ["find-a-time", "reconfirm", "add-result", "candidate-feedback", "reference-check", "client-books-directly"] as const;
type PanelName = (typeof INTERVIEW_PANELS)[number];

const TITLES: Record<PanelName, string> = {
  "find-a-time": "Find a time",
  reconfirm: "Reconfirm",
  "add-result": "Add the result",
  "candidate-feedback": "Candidate feedback",
  "reference-check": "Reference check",
  "client-books-directly": "Client books directly",
};

export default function InterviewPanel({ c, sp }: TabProps) {
  const name = sp.panel as PanelName;
  const path = `/positions/${c.position.id}`;
  const close = closeHref(path, sp);
  const on = sp.on ?? "";
  const applicationOf = c.allCandidates.find((x) => x.id === on)?.applicationTaId ?? on;
  const iv = c.itsInterviews.find((x) => x.id === on) ?? c.itsInterviews.find((x) => x.applicationTaId === applicationOf) ?? null;
  const kicker = TITLES[name];

  if (!iv) {
    return (
      <Panel kicker={kicker} title={kicker} sub={`${c.clientName} > ${c.position.title}`} closeHref={close}>
        <Chooser
          items={c.itsInterviews.map((x) => ({ id: x.id, name: x.candidateName, line: `Round ${x.round}${x.at ? " · " + slotWords(x.at) : ""}` }))}
          hrefFor={(id) => panelHref(path, sp, name, id)}
        />
      </Panel>
    );
  }

  const first = iv.candidateName.split(" ")[0] || iv.candidateName;
  const sub = `${c.clientName} > ${c.position.title} > Round ${iv.round}${iv.at ? " · " + slotWords(iv.at) : ""}`;
  const contacts = contactsFor({ position: c.position.contacts, client: c.client?.contacts });
  const contact = contacts.find((x) => iv.interviewers.includes(x.email)) ?? contacts[0] ?? null;
  const contactFirst = contact?.name.split(" ")[0] ?? c.clientName;
  const hidden = (
    <>
      <input type="hidden" name="interviewId" value={iv.id} />
      <input type="hidden" name="back" value={close} />
    </>
  );
  const clientPerson = contact ? (
    <Person name={contact.name} line={`${contact.role || "Contact"} · ${c.clientName}${contact.phone ? " · " + contact.phone : ""}`} phone={contact.phone} />
  ) : (
    <p className="t-small text-ink-3">No contact is saved for this client yet. Add one on the client's page.</p>
  );
  const candidatePerson = <Person name={iv.candidateName} line="Candidate · the number is in the TA System" />;

  const p: P = { c, iv, first, sub, close, hidden, clientPerson, candidatePerson, contactFirst };
  if (name === "find-a-time") return <FindATime {...p} />;
  if (name === "reconfirm") return <Reconfirm {...p} />;
  if (name === "add-result") return <AddResult {...p} />;
  if (name === "candidate-feedback") return <Feedback {...p} />;
  if (name === "reference-check") return <Reference {...p} />;
  return <ClientBooks {...p} />;
}

type P = {
  c: TabProps["c"];
  iv: Iv;
  first: string;
  sub: string;
  close: string;
  hidden: React.ReactNode;
  clientPerson: React.ReactNode;
  candidatePerson: React.ReactNode;
  contactFirst: string;
};

function FindATime({ c, iv, first, sub, close, hidden, clientPerson, candidatePerson, contactFirst }: P) {
  const why = [
    `${first} was shortlisted on ${dayWords(iv.createdAt)} and is not booked`,
    iv.slots.length ? `${contactFirst} gave ${iv.slots.length} ${iv.slots.length === 1 ? "time" : "times"}, recorded on ${dayWords(iv.updatedAt)}` : "No times from the client are recorded yet",
    "The system asks nobody here: you agree the time and book it",
  ];
  const chosen = chosenSlot(iv, null);
  const open = iv.state === "slots" || iv.state === "agreed";
  const free = iv.slots.filter((at) => slotAnswerFor(iv, at) !== "busy");
  return (
    <Panel kicker="Find a time" title={`Find a time for ${iv.candidateName}`} sub={sub} closeHref={close}>
      <WhyNow lines={why} />
      <PanelSection title="Who and how">
        {clientPerson}
        {candidatePerson}
        {iv.at && (
          <MessageBox
            label={`Confirmation to copy to ${first}`}
            text={confirmationText({ candidate: iv.candidateName, client: c.clientName, at: iv.at, where: iv.whereOrLink, opsPerson: c.me.name.split(" ")[0] })}
          />
        )}
      </PanelSection>
      {!open ? (
        <PanelSection title="Log it here">
          <EmptyState title="This one is past finding a time">It is {iv.state}. To move it, use Reconfirm or Add the result.</EmptyState>
        </PanelSection>
      ) : iv.slots.length === 0 ? (
        <>
          <PanelSection title="Log it here">
            <form action={recordInterviewSlots} className="flex flex-col gap-3">
              <input type="hidden" name="interviewId" value={iv.id} />
              <PanelField label={`Times ${contactFirst} gave, one a line, like 2026-11-25 10:00`}>
                <textarea name="slots" rows={4} required className={panelInput} />
              </PanelField>
              <div>
                <button className={pillPrimary}>Record the times</button>
              </div>
            </form>
          </PanelSection>
          <PanelSection title="Or ask the client">
            <p className="t-body text-ink-2">This writes a draft to the client. You read it and approve it before anything is sent.</p>
            <form action={requestInterviewSlots}>
              <input type="hidden" name="interviewId" value={iv.id} />
              <input type="hidden" name="to" value={iv.interviewers.join("\n")} />
              <button className={pillSecondary}>Draft the request for times</button>
            </form>
          </PanelSection>
        </>
      ) : (
        <form action={recordSlotAnswers} className="contents">
          <input type="hidden" name="interviewId" value={iv.id} />
          <PanelSection title="Log it here">
            <p className="t-small text-ink-3">
              Times {contactFirst} gave, and what {first} said
            </p>
            {iv.slots.map((at) => (
              <div key={at} className="flex flex-wrap items-center gap-3">
                <span className="t-body-m w-[160px]">{slotWords(at)}</span>
                <ChoiceGroup
                  name={"answer_" + at}
                  label={slotWords(at)}
                  value={slotAnswerFor(iv, at) ?? ""}
                  options={[
                    { value: "busy", label: `${first}: no`, tone: "bad" },
                    { value: "free", label: `${first}: yes`, tone: "good" },
                    { value: "", label: "Not asked" },
                  ]}
                />
              </div>
            ))}
            {iv.state === "slots" && (
              <PanelField label="Time to book">
                <ChoiceGroup name="at" label="Time to book" value={String(chosen ?? "")} options={free.map((at) => ({ value: String(at), label: slotWords(at) }))} />
              </PanelField>
            )}
          </PanelSection>
          <PanelSection title="What happens next">
            <p className="t-body text-ink-2">
              The interview goes on the calendar when you book it, and a reminder to reconfirm comes the day before. The system sends nothing: copy the confirmation to {first} and tell {contactFirst}.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              {iv.state === "slots" && (
                <button formAction={recordCandidatePick} className={pillPrimary}>
                  Agree on this time
                </button>
              )}
              <button className={pillSecondary}>Save for later</button>
            </div>
          </PanelSection>
        </form>
      )}
      {iv.state === "agreed" && iv.at && (
        <PanelSection title="Book it">
          <form action={bookInterview} className="flex flex-col gap-4">
            {hidden}
            <PanelField label="Place">
              <ChoiceGroup
                name="format"
                label="Place"
                value={iv.format}
                options={[
                  { value: "onsite", label: "At the client's office" },
                  { value: "online", label: "Online (Teams link)" },
                  { value: "phone", label: "On the phone" },
                ]}
              />
              <input name="whereOrLink" defaultValue={iv.whereOrLink} placeholder="Address or link" className={panelInput} />
            </PanelField>
            <PanelField label="Interviewer" hint="Addresses, one a line or separated by commas">
              <input name="interviewers" defaultValue={iv.interviewers.join(", ")} className={panelInput} />
            </PanelField>
            <label className="t-small flex items-center gap-2 text-ink-2">
              <input type="checkbox" name="makeTeams" /> Also make a Teams meeting (only if Teams is switched on)
            </label>
            <div>
              <button className={pillPrimary}>Book {slotWords(iv.at)}</button>
            </div>
          </form>
        </PanelSection>
      )}
    </Panel>
  );
}

function Reconfirm({ c, iv, first, sub, close, hidden, candidatePerson }: P) {
  const live = iv.state === "booked" || iv.state === "reconfirmed";
  return (
    <Panel kicker="Reconfirm" title={`Reconfirm ${iv.candidateName}`} sub={sub} closeHref={close}>
      <WhyNow
        lines={[
          iv.at ? `Interview ${slotWords(iv.at)}${iv.whereOrLink ? ", " + iv.whereOrLink : ""}` : "No time is booked",
          iv.state === "reconfirmed" ? `${first} has reconfirmed` : `${first} has not reconfirmed yet`,
        ]}
      />
      <PanelSection title="Who and how">
        {candidatePerson}
        {iv.at && <MessageBox label="Message to copy" text={reconfirmText({ candidate: iv.candidateName, client: c.clientName, at: iv.at, where: iv.whereOrLink })} />}
      </PanelSection>
      {live ? (
        <PanelSection title="Log it here">
          <form action={recordCandidateReconfirm} className="flex flex-col gap-3 border-b border-rule pb-4">
            {hidden}
            <PanelField label={`If ${first} confirmed, add an optional note`}>
              <input name="note" className={panelInput} placeholder="e.g. Confirmed by WhatsApp" />
            </PanelField>
            <div>
              <button type="submit" className={pillPrimary}>
                Reconfirmed
              </button>
            </div>
          </form>
          <form action={recordCandidateOut} className="flex flex-col gap-3 pt-1">
            {hidden}
            <PanelField label={`If ${first} cannot come, say why`}>
              <input name="reason" required className={panelInput} placeholder={`Note: what ${first} said, and how (call or WhatsApp)`} />
            </PanelField>
            <div>
              <button type="submit" className={pillSecondary}>Cannot come</button>
            </div>
          </form>
        </PanelSection>
      ) : (
        <PanelSection title="Log it here">
          <EmptyState title="Nothing to reconfirm">This interview is {iv.state}, not booked.</EmptyState>
        </PanelSection>
      )}
      <Next buttons={null}>If {first} cannot come, the interview goes back to Find a time and the client is told in good time.</Next>
    </Panel>
  );
}

function AddResult({ c, iv, first, sub, close, hidden, clientPerson, contactFirst }: P) {
  const before = c.itsInterviews.filter((x) => x.applicationTaId === iv.applicationTaId && x.round < iv.round && x.decision);
  const why = [
    iv.at ? `Add this after the interview on ${slotWords(iv.at)}` : "There is no interview time yet",
    iv.decision ? `The client decided: ${ROUND_DECISIONS[iv.decision] ?? iv.decision}` : "The client has not told us the result yet",
    ...before.map((x) => `Round ${x.round}${x.at ? " on " + dayWords(x.at) : ""}: ${ROUND_DECISIONS[x.decision ?? ""] ?? x.decision}`),
  ];
  const booked = iv.state === "booked" || iv.state === "reconfirmed";
  const waiting = iv.state === "attended" && !iv.decision;
  return (
    <Panel kicker="Add the result" title={`Add the result for ${first}`} sub={sub} closeHref={close}>
      <WhyNow lines={why} />
      <PanelSection title="Who and how">
        {clientPerson}
        <div className="flex flex-col gap-1.5">
          <span className="t-small text-ink-3">What to ask</span>
          <p className="t-body text-ink-2">
            How did round {iv.round} go with {first}?
          </p>
          <p className="t-body text-ink-2">Next round, an offer, or not moving?</p>
        </div>
      </PanelSection>
      {booked && (
        <PanelSection title="First, was it held?">
          <form action={markInterviewAttendance} className="flex flex-wrap gap-3">
            {hidden}
            <button name="came" value="attended" className={pillPrimary}>
              Mark it held
            </button>
          </form>
          <p className="t-small text-ink-3">The result can only be written once the interview is held.</p>
        </PanelSection>
      )}
      {waiting && (
        <form action={recordRoundDecision} className="contents">
          {hidden}
          <PanelSection title="Log it here">
            <ChoiceGroup
              name="decision"
              label="Result"
              required
              options={[
                { value: "next", label: "Next round" },
                { value: "selected", label: "Selected" },
                { value: "rejected", label: "Not moving" },
              ]}
            />
            <PanelField label={`Reason, if not moving (in ${contactFirst}'s words)`}>
              <textarea name="reason" rows={2} className={panelInput} />
            </PanelField>
          </PanelSection>
          <Next buttons={<button className={pillPrimary}>Save</button>}>
            Next round: {first} goes to Needs a time. Selected: {first} moves to Offer. Not moving: {first} is closed with the reason, and the TA is told.
          </Next>
        </form>
      )}
      {!booked && !waiting && (
        <PanelSection title="Log it here">
          <EmptyState title={iv.decision ? "The result is recorded" : "Not held yet"}>
            {iv.decision ? "It is in the history of this interview." : "The result is added after the interview is held."}
          </EmptyState>
        </PanelSection>
      )}
    </Panel>
  );
}

function Feedback({ c, iv, first, sub, close, hidden, candidatePerson, contactFirst }: P) {
  const later = c.itsInterviews.find((x) => x.applicationTaId === iv.applicationTaId && x.round === iv.round + 1);
  const draft =
    c.db.messages
      .filter((m) => m.subjectType === "interview" && m.subjectId === iv.id && m.templateKey === "interview.client_feedback")
      .sort((a, b) => b.createdAt - a.createdAt)[0] ?? null;
  const why = [
    `Round ${iv.round}${iv.at ? " was on " + dayWords(iv.at) : " has no time yet"}`,
    later?.at ? `The client asked for round ${later.round} on ${slotWords(later.at)}` : "No later round is booked",
    iv.candidateFeedback ? "The TA has logged what the candidate said" : "Nothing from the candidate is logged yet",
  ];
  return (
    <Panel kicker="Candidate feedback" title={`Feedback from ${iv.candidateName}`} sub={sub} closeHref={close}>
      <WhyNow lines={why} />
      <PanelSection title="Who and how">
        {candidatePerson}
        {draft && <MessageBox label={`Message to ${contactFirst}`} text={draft.body} />}
      </PanelSection>
      <PanelSection title="Log it here">
        {iv.candidateFeedback ? (
          <>
            <PanelField label="Feedback">
              <p className="t-body whitespace-pre-line rounded-[14px] border border-rule px-4 py-3.5 text-ink-2">{iv.candidateFeedback}</p>
            </PanelField>
            {draft?.state === "draft" ? (
              <form action={approveAndSend}>
                <input type="hidden" name="messageId" value={draft.id} />
                <input type="hidden" name="back" value={close} />
                <button className={pillPrimary}>Approve and send to the client</button>
              </form>
            ) : draft ? (
              <p className="t-small text-ink-3">The message to the client is {draft.state}.</p>
            ) : null}
          </>
        ) : (
          <form action={recordCandidateFeedbackByHand} className="flex flex-col gap-3">
            {hidden}
            <p className="t-small text-ink-3">The TA's own notes arrive here by themselves when the TA System sends them. Until then, type what {first} said.</p>
            <PanelField label="Feedback">
              <textarea name="feedback" rows={3} required minLength={10} className={panelInput} placeholder={`What ${first} said, in a sentence or two`} />
            </PanelField>
            <div>
              <button className={pillPrimary}>Save</button>
            </div>
          </form>
        )}
      </PanelSection>
      <Next buttons={null}>
        {later?.at ? `We wait for round ${later.round} on ${dayWords(later.at)}. ` : ""}The client keeps the next step. Saving drafts the message to the client; a person reads and approves it.
      </Next>
    </Panel>
  );
}

function Reference({ c, iv, first, sub, close, hidden, candidatePerson }: P) {
  const ref = referenceForApplication(c.db, iv.applicationTaId);
  const why = [
    ref ? `A reference was asked for on ${dayWords(ref.requestedAt)}` : "The client has not asked for a reference",
    "The TA phones the referee and writes down what was said",
    "The client gets the report as it is, we do not change it",
  ];
  const box = "t-body whitespace-pre-line rounded-[14px] border border-rule px-4 py-3.5 text-ink-2";
  return (
    <Panel kicker="Reference check" title={`Reference for ${iv.candidateName}`} sub={sub} closeHref={close}>
      <WhyNow lines={why} />
      <PanelSection title="Who and how">
        {candidatePerson}
        <p className="t-small text-ink-3">The referee's name and number are kept by the TA, who makes the call.</p>
      </PanelSection>
      <PanelSection title="Log it here">
        {!ref ? (
          <form action={requestReference} className="flex flex-col gap-3">
            {hidden}
            <label className="t-body flex items-center gap-2">
              <input type="checkbox" name="clientAsked" value="yes" required /> The client asked for a reference for {first}
            </label>
            <div>
              <button className={pillPrimary}>Ask the TA</button>
            </div>
          </form>
        ) : ref.state === "requested" ? (
          <form action={recordReferenceReport} className="flex flex-col gap-3">
            {hidden}
            <input type="hidden" name="referenceId" value={ref.id} />
            <PanelField label="Report, as the referee said it">
              <textarea name="report" rows={4} required className={panelInput} />
            </PanelField>
            <div>
              <button className={pillPrimary}>Save</button>
            </div>
          </form>
        ) : (
          <>
            <PanelField label="Report">
              <p className={box}>{ref.report}</p>
            </PanelField>
            {ref.state === "reported" && (
              <form action={relayReference}>
                {hidden}
                <input type="hidden" name="referenceId" value={ref.id} />
                <button className={pillSecondary}>Send to the client as is</button>
              </form>
            )}
            {(ref.state === "relayed" || ref.state === "reported") && (
              <form action={recordReferenceDecision} className="flex flex-col gap-3">
                {hidden}
                <input type="hidden" name="referenceId" value={ref.id} />
                <PanelField label="Result">
                  <ChoiceGroup
                    name="decision"
                    label="Result"
                    value="cleared"
                    options={[
                      { value: "cleared", label: "Cleared" },
                      { value: "dropped", label: "Client drops the candidate" },
                    ]}
                  />
                </PanelField>
                <PanelField label="Why, if dropped">
                  <input name="reason" className={panelInput} />
                </PanelField>
                <div>
                  <button className={pillPrimary}>Save</button>
                </div>
              </form>
            )}
            {(ref.state === "cleared" || ref.state === "dropped") && <p className="t-body text-ink-2">Recorded: {ref.state}.</p>}
          </>
        )}
      </PanelSection>
      <Next buttons={null}>
        Cleared: {first} stays in the process and the client decides. Dropped: {first} leaves the process with the reason.
      </Next>
    </Panel>
  );
}

function ClientBooks({ c, iv, first, sub, close, hidden, clientPerson, contactFirst }: P) {
  // The candidate's number is held by the TA System, so the message names none.
  const text = clientBooksText({ client: c.clientName, contact: contactFirst, candidate: iv.candidateName, phone: "", opsPerson: c.me.name.split(" ")[0] });
  return (
    <Panel kicker="Client books directly" title={`${contactFirst} books ${first} directly`} sub={sub} closeHref={close}>
      <WhyNow
        lines={[
          `${c.clientName} prefers to book ${first} themselves`,
          "We do not set the time this time",
          iv.at ? `The client's date is recorded: ${slotWords(iv.at)}` : "No date has been reported yet",
        ]}
      />
      <PanelSection title="Who and how">
        {clientPerson}
        <MessageBox label={`Message to ${contactFirst}`} text={text} />
      </PanelSection>
      <form action={recordClientBooking} className="contents">
        {hidden}
        <PanelSection title="Log it here">
          <PanelField label="Client reported the date">
            <input type="datetime-local" name="at" required defaultValue={iv.at ? localInput(iv.at) : undefined} className={panelInput} />
          </PanelField>
          <PanelField label="Place">
            <ChoiceGroup
              name="format"
              label="Place"
              value={iv.format}
              options={[
                { value: "onsite", label: "At their office" },
                { value: "online", label: "Online" },
                { value: "phone", label: "On the phone" },
              ]}
            />
            <input name="whereOrLink" defaultValue={iv.whereOrLink} placeholder="The link they sent, or their office" className={panelInput} />
          </PanelField>
        </PanelSection>
        <Next buttons={<button className={pillPrimary}>Save</button>}>
          When the date is saved, a task is set to confirm it with the client. Then book it on our side so the reminders run.
        </Next>
      </form>
    </Panel>
  );
}
