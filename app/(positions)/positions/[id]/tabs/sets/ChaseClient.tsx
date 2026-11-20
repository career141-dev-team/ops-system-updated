import Link from "next/link";

import { logManualChase } from "@/app/actions";
import Panel, { PanelSection } from "@/app/ui/Panel";
import { EmptyState, panelInput, pillSecondary } from "@/app/ui/figma";
import { closeHref } from "@/lib/panel";
import { awaiting, dayOfWindow, shortDay } from "@/lib/setsBoard";
import { OWNERSHIP_WORKING_DAYS } from "@/lib/clientFeedback";
import { numberOf } from "@/data/desk";

import type { TabProps } from "../ctx";
import CopyButton from "./CopyButton";
import { AnswerForm, WhatNext, WhoAndHow, WhyNow, chipBtn, rolePath, trail } from "./shared";

/** R2 chase-client (180:130): the chase that is drafted for a set with no answer, and the answers as they come. */
export default function ChaseClient({ c, sp }: TabProps) {
  const close = closeHref(rolePath(c), sp);
  const set = c.itsSets.find((s) => s.id === sp.on && s.state === "sent");
  if (!set || awaiting(set) === 0) {
    return (
      <Panel kicker="Chase the client" title="Chase the client" closeHref={close}>
        <EmptyState title="Nothing to chase">A client who has answered is not chased. Pick a set that is still waiting.</EmptyState>
      </Panel>
    );
  }
  const windowDays = numberOf(c.db, "set.ownershipWorkingDays", OWNERSHIP_WORKING_DAYS);
  const holidays = c.db.holidays.map((h) => h.date);
  const open = set.candidates.filter((x) => !x.decision && !x.claimedAt);
  const drafts = c.db.messages.filter((m) => m.subjectId === set.id && m.templateKey === "feedback.chase");
  const latest = drafts[drafts.length - 1] ?? null;
  const calls = c.db.timers.filter((t) => t.subjectId === set.id && t.kind === "feedback.call" && (t.state === "running" || t.state === "warned"));
  return (
    <Panel kicker="Chase the client" title={`Chase ${c.clientName} for answers on SET ${set.setNumber}`} sub={trail(c, set)} closeHref={close}>
      <WhyNow
        items={[
          `SET ${set.setNumber} is on day ${dayOfWindow(set, c.now, holidays, windowDays)} of ${windowDays}`,
          `${open.length} ${open.length === 1 ? "person" : "people"} still have no answer`,
          latest?.sentAt ? `The last chase went on ${shortDay(latest.sentAt)}, no reply` : latest ? "A chase is drafted and waits for a person to approve it" : "No chase has gone yet",
        ]}
      />
      <WhoAndHow c={c}>
        {latest ? (
          <div className="flex flex-col gap-2">
            <span className="t-small text-ink-3">Chase message ({latest.state === "draft" ? "drafted, not sent" : latest.state})</span>
            <div className="t-body whitespace-pre-line rounded-[10px] border border-rule px-3.5 py-3 text-ink-2">{latest.body}</div>
            <div className="flex flex-wrap gap-2">
              <CopyButton text={latest.body} label="Copy the message" />
              <Link href={`/messages/${latest.id}`} className={chipBtn}>
                Open the draft to read and approve it
              </Link>
            </div>
          </div>
        ) : (
          <p className="t-small text-ink-3">No chase is drafted yet: the clock drafts one a day after the set goes, and a person approves it before it is sent.</p>
        )}
      </WhoAndHow>
      <PanelSection title="LOG IT HERE">
        <form action={logManualChase} className="flex flex-col gap-2.5 border-b border-rule pb-4">
          <input type="hidden" name="subjectType" value="clientSet" />
          <input type="hidden" name="subjectId" value={set.id} />
          <input type="hidden" name="back" value={close} />
          <span className="t-small text-ink-3">Log a chase made by hand</span>
          <div className="flex flex-wrap gap-2">
            <select name="channel" defaultValue="whatsapp" className={panelInput + " !w-auto"}>
              <option value="whatsapp">WhatsApp</option>
              <option value="call">Phone call</option>
              <option value="email">Email</option>
            </select>
            <input name="note" required placeholder="What you sent or what they said" className={panelInput + " flex-1 min-w-[180px]"} />
          </div>
          <button type="submit" className={pillSecondary + " self-start"}>
            Log manual chase
          </button>
        </form>
        {open.map((x) => (
          <AnswerForm key={x.applicationTaId} set={set} who={x} back={close} />
        ))}
      </PanelSection>
      <WhatNext>
        {calls[0] ? `The next call is set for ${shortDay(calls[0].dueAt)}. ` : "A call follows if the silence goes on. "}
        Anyone shortlisted moves to Interviews, and chasing stops for a set the client has answered.
      </WhatNext>
    </Panel>
  );
}
