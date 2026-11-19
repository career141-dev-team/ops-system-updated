import Link from "next/link";

import Panel, { PanelSection } from "@/app/ui/Panel";
import { Avatar, EmptyState, StatusChip, panelInput, pillPrimary, pillSecondary } from "@/app/ui/figma";
import { dropFromClientSet, recordInternalInterview, reviewClientSet, sendClientSet } from "@/app/actions";
import { MIN_CVS, dueInWords, problemWithSending } from "@/lib/clientSets";
import { contactsFor, setRecipients } from "@/lib/contacts";
import { closeHref } from "@/lib/panel";
import { shortDay } from "@/lib/setsBoard";
import { numberOf, templateFor } from "@/data/desk";

import type { TabProps } from "../ctx";
import CopyButton from "./CopyButton";
import { WhatNext, WhoAndHow, WhyNow, chipBtn, rolePath, trail } from "./shared";

const INTERNAL_CHIP = { pass: "Interviewed · passed", hold: "Interview · on hold", fail: "Interview · failed" } as const;

/** R2 build-set (180:2): read the set, keep its CVs, record our own interviews, then draft the email a person approves. */
export default function BuildSet({ c, sp }: TabProps) {
  const close = closeHref(rolePath(c), sp);
  const set = c.itsSets.find((s) => s.id === sp.on && s.state !== "sent" && s.state !== "withdrawn");
  if (!set) {
    return (
      <Panel kicker="Build the set" title="Build the set" closeHref={close}>
        <EmptyState title="No set waits to be built">A set appears here when the TA System says its CVs are ready.</EmptyState>
      </Panel>
    );
  }
  const minimum = numberOf(c.db, "set.minCvs", MIN_CVS);
  const needInterview = c.db.settings.find((s) => s.key === "set.requireInternalInterview")?.value !== false;
  const to = setRecipients({ position: c.position.contacts, client: c.client?.contacts });
  const hole = problemWithSending(set.candidates, to, minimum, needInterview);
  const who = contactsFor({ position: c.position.contacts, client: c.client?.contacts })[0] ?? null;
  const sent = c.sentSets[c.sentSets.length - 1] ?? null;
  const wording = templateFor(c.db, "set.cover");
  const cover = wording
    ? wording.body
        .replace(/\{\{client\}\}/g, c.clientName)
        .replace(/\{\{position\}\}/g, set.role)
        .replace(/\{\{setNumber\}\}/g, String(set.setNumber))
        .replace(/\{\{cvCount\}\}/g, String(set.candidates.length))
        .replace(/\{\{contact\}\}/g, who?.name ?? "all")
        .replace(/\{\{opsPerson\}\}/g, c.me.name)
    : null;
  return (
    <Panel kicker="Build the set" title={`Build SET ${set.setNumber} for ${c.clientName}`} sub={trail(c, set)} closeHref={close}>
      <WhyNow
        items={[
          `${set.candidates.length} ${set.candidates.length === 1 ? "person is" : "people are"} ready from the TA${set.dueAt ? `. SET ${set.setNumber} is ${dueInWords(set.dueAt, c.now)}, on ${shortDay(set.dueAt)}` : ""}`,
          sent?.sentAt ? `SET ${sent.setNumber} was sent on ${shortDay(sent.sentAt)}` : "No set has gone to the client yet",
          set.candidates.length < minimum ? `A set needs at least ${minimum} CVs; this one has ${set.candidates.length}` : "The set has enough CVs to go",
        ]}
      />
      <WhoAndHow c={c} />
      <PanelSection title="WHO GOES IN">
        {set.candidates.map((x) => (
          <div key={x.applicationTaId} className="flex flex-col gap-2.5 border-t border-rule pt-3.5 first:border-t-0 first:pt-0">
            <div className="flex items-center gap-3.5">
              <Avatar name={x.name} size="40" tone="neutral" />
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="t-body-m">{x.name}</span>
                <span className="t-small text-ink-3">{x.fileId ? "CV kept" : (x.problem ?? "CV not kept yet")}</span>
              </div>
              <StatusChip
                label={x.internalInterview ? INTERNAL_CHIP[x.internalInterview.outcome] : "Not interviewed"}
                tone={x.internalInterview?.outcome === "pass" ? "ok" : x.internalInterview ? "warn" : "neutral"}
              />
            </div>
            {c.mayManage && !x.internalInterview && (
              <form action={recordInternalInterview} className="flex flex-wrap items-center gap-2">
                <input type="hidden" name="setId" value={set.id} />
                <input type="hidden" name="applicationTaId" value={x.applicationTaId} />
                <input type="hidden" name="back" value={close} />
                <input name="notes" placeholder="Our interview: notes" aria-label={`Interview notes for ${x.name}`} className={panelInput + " min-w-[200px] flex-1"} />
                {(["pass", "hold", "fail"] as const).map((o) => (
                  <button key={o} type="submit" name="outcome" value={o} className={o === "pass" ? pillPrimary : pillSecondary}>
                    {o === "pass" ? "Pass" : o === "hold" ? "Hold" : "Fail"}
                  </button>
                ))}
              </form>
            )}
            {c.mayManage && !x.fileId && (
              <form action={dropFromClientSet} className="flex flex-wrap items-center gap-2">
                <input type="hidden" name="setId" value={set.id} />
                <input type="hidden" name="applicationTaId" value={x.applicationTaId} />
                <input name="reason" placeholder="Why they are coming out of the set" aria-label={`Why ${x.name} comes out`} className={panelInput + " min-w-[200px] flex-1"} />
                <button type="submit" className={pillSecondary}>
                  Take out of the set
                </button>
              </form>
            )}
          </div>
        ))}
        {c.mayManage && (
          <form action={reviewClientSet}>
            <input type="hidden" name="setId" value={set.id} />
            <button type="submit" className={pillSecondary}>
              {set.candidates.some((x) => x.fileId) ? "Fetch anything missing" : "Read the set and keep the CVs"}
            </button>
          </form>
        )}
        {set.candidates.some((x) => x.fileId) && (
          <a href={`/api/sets/${set.id}/zip`} className={chipBtn + " self-start"}>
            Download all CVs
          </a>
        )}
      </PanelSection>
      <PanelSection title="THE EMAIL">
        {cover ? (
          <>
            <span className="t-small text-ink-3">Cover email, as it will be drafted</span>
            <div className="t-body whitespace-pre-line rounded-[10px] border border-rule px-3.5 py-3 text-ink-2">{cover}</div>
            <CopyButton text={cover} label="Copy the email" />
          </>
        ) : (
          <p className="t-small text-ink-3">No cover wording is saved yet; the default is used. Change it under Templates.</p>
        )}
        <p className="t-small text-ink-3">
          The email and the group post are drafted, not sent. You read them on the{" "}
          <Link href="/?view=approve" className="underline">
            To approve
          </Link>{" "}
          list on My work and approve them there.
        </p>
      </PanelSection>
      <WhatNext
        actions={
          c.mayManage ? (
            <form action={sendClientSet}>
              <input type="hidden" name="setId" value={set.id} />
              <button type="submit" className={pillPrimary}>
                Draft the email for approval
              </button>
            </form>
          ) : undefined
        }
      >
        {hole ? `Not ready: ${hole}` : "Nothing is missing. The 7-day clock starts when the client gets the set. If there is no answer after a day, a chase is drafted for you."}
      </WhatNext>
    </Panel>
  );
}
