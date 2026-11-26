import Panel, { PanelSection } from "@/app/ui/Panel";
import { EmptyState, PanelField, panelInput, pillSecondary } from "@/app/ui/figma";
import { recordSetReceived } from "@/app/actions";
import { closeHref } from "@/lib/panel";
import { awaiting, shortDay, unanswered } from "@/lib/setsBoard";

import type { TabProps } from "../ctx";
import { AnswerForm, WhatNext, WhoAndHow, WhyNow, rolePath, trail } from "./shared";

/** R2 record-answer (124:2): the client has answered about a set; log it person by person. */
export default function RecordAnswer({ c, sp }: TabProps) {
  const close = closeHref(rolePath(c), sp);
  const set = c.itsSets.find((s) => s.id === sp.on && s.state === "sent");
  if (!set) {
    return (
      <Panel kicker="Record the answer" title="Record the answer" closeHref={close}>
        <EmptyState title="That set has not gone to the client">Pick a set that is with the client from the board.</EmptyState>
      </Panel>
    );
  }
  const open = set.candidates.filter(unanswered);
  const said = set.candidates.filter((x) => !unanswered(x));
  const chases = c.db.messages.filter((m) => m.subjectId === set.id && m.templateKey === "feedback.chase" && m.state !== "draft");
  const whenLocal = (at: number) => new Date(at + 5.5 * 3_600_000).toISOString().slice(0, 16).replace("T", " ");
  return (
    <Panel kicker="Record the answer" title={`Record the answer on SET ${set.setNumber}`} sub={trail(c, set)} closeHref={close}>
      <WhyNow
        items={[
          `SET ${set.setNumber} was sent${set.sentAt ? " on " + shortDay(set.sentAt) : ""}, ${set.candidates.length} ${set.candidates.length === 1 ? "person" : "people"}`,
          `${awaiting(set)} still without an answer`,
          chases.length ? `${chases.length} chase${chases.length === 1 ? "" : "s"} sent so far` : "No chase has gone yet",
        ]}
      />
      <WhoAndHow c={c} />
      <PanelSection title="LOG IT HERE">
        {open.length === 0 ? (
          <EmptyState title="Everyone in this set has an answer">The shortlisted move to Interviews on their own.</EmptyState>
        ) : (
          <>
            <p className="t-small text-ink-3">One person at a time: each answer is saved when you press its Save. Nothing is sent to the client.</p>
            {open.map((x) => (
              <AnswerForm key={x.applicationTaId} set={set} who={x} back={close} />
            ))}
          </>
        )}
        {said.length > 0 && (
          <ul className="t-small flex flex-col gap-1 border-t border-rule pt-3 text-ink-3">
            {said.map((x) => (
              <li key={x.applicationTaId}>
                {x.name}: {x.claimedAt ? "the client already had this CV" : x.decision === "shortlisted" ? "shortlisted" : "rejected"}
                {x.decisionReason ? ` (${x.decisionReason})` : ""}
              </li>
            ))}
          </ul>
        )}
      </PanelSection>
      {c.mayManage && (
        <PanelSection title="WHEN THEY RECEIVED IT">
          <form action={recordSetReceived} className="flex flex-col gap-3">
            <input type="hidden" name="setId" value={set.id} />
            <PanelField label="They actually received it (Colombo time)" hint="Every clock after this counts from then.">
              <input type="datetime-local" name="receivedAt" required defaultValue={set.receivedAt ? whenLocal(set.receivedAt).replace(" ", "T") : ""} className={panelInput} />
            </PanelField>
            <div>
              <button type="submit" className={pillSecondary}>
                Correct the date
              </button>
            </div>
          </form>
        </PanelSection>
      )}
      <WhatNext>
        The shortlisted move to Interviews. A rejected person is closed with the reason. Anyone with no answer stays open, and a client who has answered is not chased.
      </WhatNext>
    </Panel>
  );
}
