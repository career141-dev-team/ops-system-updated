import { approveAndSend, bookInterview, sendClientSet, writeNewMessage } from "@/app/actions";
import PreviewAndSend, { SendLeftSection } from "@/app/ui/PreviewAndSend";
import { switchedOn } from "@/data/desk";
import { problemWithSending } from "@/lib/clientSets";
import { contactsFor } from "@/lib/contacts";
import { unanswered } from "@/lib/setsBoard";

import type { RoleCtx } from "./ctx";
import { clock, weekdayDayMonth } from "./shared/fmt";

/**
 * All 5 Role Page Preview & Send overlays (1600px):
 * - R1 send · Book the interview (3:11552)       -> ?send=book-interview&on=<interviewId>
 * - R1 send · Candidate feedback (3:12295)       -> ?send=candidate-feedback&on=<interviewId>
 * - R1 send · Reconfirm (3:11978)                -> ?send=reconfirm&on=<interviewId>
 * - R2 send · Send SET (3:11727)                 -> ?send=send-set&on=<setId>
 * - R2 send · Chase client for answers (3:12211) -> ?send=chase-set&on=<setId>
 */

const initials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("") || "?";

export function RoleSendModal({
  send,
  on,
  c,
  closeHref,
}: {
  send: string;
  on?: string;
  c: RoleCtx;
  closeHref: string;
}) {
  const { db, me, position, client, clientName } = c;
  const contacts = contactsFor({ client: client?.contacts, position: position.contacts });
  const hr = contacts.find((x) => x.role === "hr") ?? contacts[0] ?? null;
  const hrName = hr?.name || clientName;
  const hrEmail = hr?.email || "";
  const hrPhone = hr?.phone || "";

  if (send === "book-interview") {
    const iv = (on ? c.itsInterviews.find((x) => x.id === on) : null) ?? c.liveIv;
    if (!iv) return null;
    const answers = iv.slotAnswers ?? [];
    const freeSlot = iv.slots.find((t) => answers.find((a) => a.at === t)?.free === true) ?? iv.slots[0] ?? null;
    const chosenAt = iv.at ?? freeSlot;
    const when = chosenAt ? `${weekdayDayMonth(chosenAt)}, ${clock(chosenAt)}` : "Confirm slot in Find a time";
    const where = iv.whereOrLink || (iv.format === "onsite" ? "Client office" : "Online (Teams link)");
    const interviewerLine = iv.interviewers.length ? iv.interviewers.join(", ") : hrName;
    const candidateEmailBody = `Hi ${iv.candidateName.split(" ")[0]},\n\nYour round ${iv.round} interview with ${clientName} for ${position.title} is booked for ${when} (${where}). You will meet ${interviewerLine}.\n\nPlease reply here if anything changes.\n\nKind regards,\n${me.name}\nCareer141 Ops`;
    const clientEmailBody = `Hi ${hrName},\n\nConfirming the round ${iv.round} interview for ${iv.candidateName} (${position.title}) on ${when} (${where}).\n\nKind regards,\n${me.name}\nCareer141 Ops`;
    const waBody = `Hello ${iv.candidateName.split(" ")[0]}, your round ${iv.round} interview with ${clientName} (${position.title}) is booked for ${when} at ${where}. Please confirm you can attend.`;

    return (
      <PreviewAndSend
        title={`Book ${iv.candidateName.split(" ")[0]} · round ${iv.round}`}
        sub={`${clientName} > ${position.title}`}
        closeHref={closeHref}
        action={bookInterview}
        hidden={{
          interviewId: iv.id,
          format: iv.format || "online",
          at: chosenAt ? new Date(chosenAt).toISOString().slice(0, 16) : "",
          whereOrLink: iv.whereOrLink || "",
          interviewers: interviewerLine,
          back: closeHref,
        }}
        sendLabel="Send invite and messages"
        disabledReason={chosenAt ? null : "Pick or enter a time in Find a time before booking."}
        note="Books the interview, attaches the .ics calendar invite, tells TA, and sends through the outbound gate."
        left={
          <>
            <SendLeftSection title="Pick the time">
              {iv.slots.length === 0 ? (
                <p className="t-small rounded-[14px] border border-rule bg-surface px-4 py-3 text-ink-3">
                  No slots recorded yet. Add them in Find a time.
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-2.5">
                  {iv.slots.map((slotAt, idx) => {
                    const ans = answers.find((a) => a.at === slotAt);
                    const isPicked = slotAt === chosenAt;
                    const tone =
                      ans?.free === false
                        ? "bg-bg-danger text-danger"
                        : ans?.free === true
                          ? "bg-bg-brand text-brand"
                          : "bg-surface border border-rule text-ink-2";
                    return (
                      <div
                        key={idx}
                        className={`flex flex-col gap-0.5 rounded-[16px] px-3.5 py-3 ${tone} ${isPicked ? "ring-2 ring-ink" : ""}`}
                      >
                        <span className="t-small font-medium text-ink-2">{weekdayDayMonth(slotAt)}</span>
                        <span className="text-[18px] font-medium leading-6 text-ink">{clock(slotAt)}</span>
                        <span className="t-label">
                          {ans?.free === false ? "Busy" : ans?.free === true ? "Fits both" : "Not asked"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </SendLeftSection>
            <SendLeftSection title="Place">
              <p className="t-body rounded-[14px] border border-rule bg-surface px-4 py-3 text-ink">{where}</p>
            </SendLeftSection>
            <SendLeftSection title="Interviewer">
              <div className="flex items-center gap-3 rounded-[14px] border border-rule bg-surface px-4 py-3">
                <span className="inline-flex size-8 items-center justify-center rounded-full bg-violet-soft text-[12px] font-medium text-violet">
                  {initials(interviewerLine)}
                </span>
                <div className="min-w-0">
                  <p className="t-body-m truncate text-ink">{interviewerLine}</p>
                  <p className="t-small truncate text-ink-3">{clientName}</p>
                </div>
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
              dateTag: when,
              title: `Interview · ${iv.candidateName} · ${position.title}, round ${iv.round}`,
              when,
              where,
              guests: [
                { initials: initials(me.name), name: me.name, tone: "bg-bg-brand text-brand" },
                { initials: initials(iv.candidateName), name: iv.candidateName, tone: "bg-info-soft text-info" },
                { initials: initials(hrName), name: hrName, tone: "bg-violet-soft text-violet" },
              ],
              notes: `Round ${iv.round} interview.`,
            },
            alsoEmail: {
              from: `${me.name}, Career141 <${me.email}>`,
              to: iv.candidateName,
              subject: `Your interview with ${clientName}, ${when}`,
              body: candidateEmailBody,
            },
          },
          {
            key: "wa-cand",
            label: `WhatsApp to ${iv.candidateName.split(" ")[0]}`,
            kind: "whatsapp",
            whatsapp: { recipient: iv.candidateName, body: waBody },
          },
          {
            key: "email-client",
            label: `Email to ${hrName.split(" ")[0]}`,
            kind: "email",
            email: {
              from: `${me.name}, Career141 <${me.email}>`,
              to: hrEmail || hrName,
              subject: `Interview confirmed: ${iv.candidateName} — ${position.title}`,
              body: clientEmailBody,
            },
          },
        ]}
      />
    );
  }

  if (send === "candidate-feedback") {
    const iv = (on ? c.itsInterviews.find((x) => x.id === on) : null) ?? c.liveIv;
    if (!iv) return null;
    const draft = db.messages.find(
      (m) => m.subjectType === "interview" && m.subjectId === iv.id && m.state === "draft",
    );
    const words = iv.candidateFeedback || "Candidate shared positive feedback after the interview.";
    const body =
      draft?.body ??
      `Hi ${hrName},\n\nHere is ${iv.candidateName}'s feedback following round ${iv.round} for ${position.title}:\n\n"${words}"\n\nPlease let us know how you would like to proceed.\n\nKind regards,\n${me.name}`;

    return (
      <PreviewAndSend
        title={`${iv.candidateName.split(" ")[0]} · feedback`}
        sub={`${clientName} > ${position.title} · Round ${iv.round}`}
        closeHref={closeHref}
        action={draft ? approveAndSend : hrEmail ? writeNewMessage : undefined}
        hidden={
          draft
            ? { messageId: draft.id, back: closeHref }
            : { to: hrEmail, about: `interview|${iv.id}`, back: closeHref, sendNow: "1" }
        }
        sendLabel="Send feedback to client"
        disabledReason={!draft && !hrEmail ? "Add a client HR email first." : null}
        note="Relays the candidate's own words through the outbound gate."
        left={
          <SendLeftSection title="About this feedback">
            <div className="flex flex-col gap-2 rounded-[16px] border border-rule bg-surface p-4">
              <p className="t-body-m text-ink">{iv.candidateName}</p>
              <p className="t-small text-ink-3">Round {iv.round} · {position.title}</p>
              <p className="t-small mt-1 italic text-ink-2">“{words}”</p>
            </div>
          </SendLeftSection>
        }
        tabs={[
          {
            key: "email",
            label: `Email to ${hrName.split(" ")[0]}`,
            kind: "email",
            email: {
              from: `${me.name}, Career141 <${me.email}>`,
              to: hrEmail || hrName,
              subject: draft?.subject ?? `Candidate feedback: ${iv.candidateName} — ${position.title}`,
              body,
            },
          },
          {
            key: "whatsapp",
            label: "WhatsApp",
            kind: "whatsapp",
            whatsapp: { recipient: hrName, phone: hrPhone, body },
          },
        ]}
      />
    );
  }

  if (send === "reconfirm") {
    const iv = (on ? c.itsInterviews.find((x) => x.id === on) : null) ?? c.liveIv;
    if (!iv) return null;
    const when = iv.at ? `${weekdayDayMonth(iv.at)} ${clock(iv.at)}` : "upcoming";
    const where = iv.whereOrLink || (iv.format === "onsite" ? "Client office" : "Online");
    const waBody = `Hello ${iv.candidateName.split(" ")[0]}, just reconfirming your round ${iv.round} interview with ${clientName} (${position.title}) on ${when} (${where}). Please reply YES to confirm.`;
    const emailBody = `Hi ${hrName},\n\nReconfirming ${iv.candidateName}'s round ${iv.round} interview for ${position.title} on ${when} (${where}).\n\nKind regards,\n${me.name}`;

    return (
      <PreviewAndSend
        title={`${iv.candidateName.split(" ")[0]} · round ${iv.round}`}
        sub={`${when} · ${clientName} > ${position.title}`}
        closeHref={closeHref}
        action={hrEmail ? writeNewMessage : undefined}
        hidden={{
          to: hrEmail,
          about: `interview|${iv.id}`,
          back: closeHref,
          sendNow: "1",
        }}
        sendLabel="Send reconfirmation"
        disabledReason={hrEmail ? null : "Copy the WhatsApp message to reconfirm the candidate."}
        note="Copy WhatsApp for the candidate, or send the email reminder to the client."
        left={
          <SendLeftSection title="Where it stands">
            <div className="rounded-[16px] border border-rule bg-surface p-4">
              <p className="t-body-m text-ink">{iv.candidateName}</p>
              <p className="t-small text-ink-3">{when} · {where}</p>
            </div>
          </SendLeftSection>
        }
        tabs={[
          {
            key: "whatsapp",
            label: `WhatsApp to ${iv.candidateName.split(" ")[0]}`,
            kind: "whatsapp",
            whatsapp: { recipient: iv.candidateName, body: waBody },
          },
          {
            key: "email",
            label: `Email to ${hrName.split(" ")[0]}`,
            kind: "email",
            email: {
              from: `${me.name}, Career141 <${me.email}>`,
              to: hrEmail || hrName,
              subject: `Reconfirming interview: ${iv.candidateName} — ${when}`,
              body: emailBody,
            },
          },
        ]}
      />
    );
  }

  if (send === "send-set") {
    const set = (on ? c.itsSets.find((s) => s.id === on) : null) ?? c.itsSets[0];
    if (!set) return null;
    const requireInternal = switchedOn(db, "set.requireInternalInterview");
    const problem = problemWithSending(set.candidates, hrEmail ? [hrEmail] : [], 5, requireInternal);
    const active = set.candidates;
    const attachments = active.map((cand) => ({
      name: `${cand.name.replace(/\s+/g, "_")}_CV.pdf`,
      href: cand.fileId ? `/api/files/${cand.fileId}/view` : undefined,
    }));
    const emailBody = `Dear ${hrName},\n\nPlease find attached SET ${set.setNumber} (${active.length} prepared CVs) for ${position.title}:\n\n${active.map((x, i) => `${i + 1}. ${x.name}`).join("\n")}\n\nPlease share your feedback within 7 working days.\n\nKind regards,\n${me.name}\nCareer141`;
    const waBody = `Hi ${hrName}, we have just emailed SET ${set.setNumber} (${active.length} CVs) for ${position.title}: ${active.map((x) => x.name).join(", ")}. Please let us know who you'd like to interview.`;

    return (
      <PreviewAndSend
        title={`Send SET ${set.setNumber}`}
        sub={`${clientName} > ${position.title} · ${active.length} CVs`}
        closeHref={closeHref}
        action={sendClientSet}
        hidden={{
          setId: set.id,
          back: closeHref,
        }}
        sendLabel={`Send SET ${set.setNumber}`}
        disabledReason={problem ?? (hrEmail ? null : "Add a client HR email address before sending.")}
        note="Sends CVs to client HR contacts through the outbound gate and starts the 7-working-day ownership clock."
        left={
          <SendLeftSection title={`In this set (${active.length})`}>
            <div className="flex flex-col gap-2">
              {active.map((cand) => (
                <div key={cand.applicationTaId} className="flex items-center justify-between gap-2 rounded-[14px] border border-rule bg-surface px-3.5 py-2.5">
                  <span className="t-body-m truncate text-ink">{cand.name}</span>
                  <span className={"t-label shrink-0 " + (cand.fileId ? "text-brand" : "text-danger")}>
                    {cand.fileId ? "CV ready" : "No CV"}
                  </span>
                </div>
              ))}
            </div>
          </SendLeftSection>
        }
        tabs={[
          {
            key: "email",
            label: `Email to ${hrName.split(" ")[0]}`,
            kind: "email",
            email: {
              from: `${me.name}, Career141 <${me.email}>`,
              to: hrEmail || "No HR email on file",
              subject: `SET ${set.setNumber} — ${position.title} (${active.length} CVs)`,
              body: emailBody,
              attachments,
            },
          },
          {
            key: "whatsapp",
            label: "WhatsApp group post",
            kind: "whatsapp",
            whatsapp: { recipient: client?.groupName || `${clientName} group`, body: waBody },
          },
        ]}
      />
    );
  }

  if (send === "chase-set") {
    const set = (on ? c.itsSets.find((s) => s.id === on) : null) ?? c.itsSets[0];
    if (!set) return null;
    const waiting = set.candidates.filter(unanswered);
    const body = `Hi ${hrName},\n\nFollowing up on SET ${set.setNumber} for ${position.title}. We are still waiting on your decision for ${waiting.length} ${waiting.length === 1 ? "candidate" : "candidates"}:\n\n${waiting.map((w) => `• ${w.name}`).join("\n")}\n\nCould you let us know who you would like to shortlist for interviews?\n\nKind regards,\n${me.name}`;

    return (
      <PreviewAndSend
        title={`Chase · SET ${set.setNumber}`}
        sub={`${clientName} > ${position.title}`}
        closeHref={closeHref}
        action={hrEmail ? writeNewMessage : undefined}
        hidden={{
          to: hrEmail,
          about: `clientSet|${set.id}`,
          back: closeHref,
          sendNow: "1",
        }}
        sendLabel="Send chase"
        disabledReason={waiting.length === 0 ? "The client has answered about everyone, so there is nothing to chase." : hrEmail ? null : "Add a client HR email (or copy the WhatsApp chase)."}
        note="Goes through the outbound gate."
        left={
          <SendLeftSection title={`Without an answer (${waiting.length})`}>
            <div className="flex flex-col gap-2">
              {waiting.length === 0 ? (
                <p className="t-small text-ink-3">Everyone in SET {set.setNumber} has an answer.</p>
              ) : (
                waiting.map((w) => (
                  <div key={w.applicationTaId} className="rounded-[14px] border border-rule bg-surface px-3.5 py-2.5">
                    <p className="t-body-m text-ink">{w.name}</p>
                    <p className="t-small text-ink-3">SET {set.setNumber}, no answer</p>
                  </div>
                ))
              )}
            </div>
          </SendLeftSection>
        }
        tabs={[
          {
            key: "email",
            label: `Email to ${hrName.split(" ")[0]}`,
            kind: "email",
            email: {
              from: `${me.name}, Career141 <${me.email}>`,
              to: hrEmail || "No HR email on file",
              subject: `Following up on SET ${set.setNumber} — ${position.title}`,
              body,
            },
          },
          {
            key: "whatsapp",
            label: "WhatsApp",
            kind: "whatsapp",
            whatsapp: { recipient: hrName, phone: hrPhone, body },
          },
        ]}
      />
    );
  }

  return null;
}
