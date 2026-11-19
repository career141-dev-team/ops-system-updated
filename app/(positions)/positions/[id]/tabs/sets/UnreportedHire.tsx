import Panel, { PanelSection } from "@/app/ui/Panel";
import { ChoiceGroup, EmptyState, PanelField, panelInput, pillPrimary, pillSecondary } from "@/app/ui/figma";
import { confirmUnreportedHire, dismissUnreportedHire } from "@/app/actions";
import { OWNERSHIP_WORKING_DAYS, ownershipWindow } from "@/lib/clientFeedback";
import { closeHref } from "@/lib/panel";
import { shortDay } from "@/lib/setsBoard";
import { numberOf } from "@/data/desk";

import type { TabProps } from "../ctx";
import { WhatNext, WhoAndHow, WhyNow, contactOf, rolePath, trail } from "./shared";

/** R2 unreported-hire (187:511): did the client hire from a set and not tell us? `on` is the set (the last sent one if none). */
export default function UnreportedHire({ c, sp }: TabProps) {
  const close = closeHref(rolePath(c), sp);
  const sent = c.sentSets;
  const set = sent.find((s) => s.id === sp.on) ?? sent[0] ?? null;
  if (!set) {
    return (
      <Panel kicker="Unreported hire" title="Unreported hire check" closeHref={close}>
        <EmptyState title="No set has gone yet">The check is about a set the client has had.</EmptyState>
      </Panel>
    );
  }
  const windowDays = numberOf(c.db, "set.ownershipWorkingDays", OWNERSHIP_WORKING_DAYS);
  const win = set.receivedAt === null ? null : ownershipWindow(set.receivedAt, c.db.holidays.map((h) => h.date), windowDays);
  const surcharge = c.db.invoices.find((i) => i.setId === set.id && i.kind === "surcharge") ?? null;
  const notPlaced = set.candidates.filter((x) => x.decision !== "shortlisted").length;
  const first = (contactOf(c)?.name ?? c.clientName).split(" ")[0];
  return (
    <Panel kicker="Unreported hire" title={`Did ${c.clientName} hire from SET ${set.setNumber}?`} sub={trail(c, set)} closeHref={close}>
      <WhyNow
        items={[
          `SET ${set.setNumber} was sent${set.sentAt ? " on " + shortDay(set.sentAt) : ""}${win ? ` and the ${windowDays} working day window ${win.closesAt > c.now ? "ends" : "ended"} on ${shortDay(win.closesAt)}` : ""}`,
          "Three months after a set goes out, a clock asks this question",
          "A hire from the set that nobody told us about is billed a surcharge under the agreement",
        ]}
      />
      <WhoAndHow c={c}>
        <div className="flex flex-col gap-1">
          <span className="t-small text-ink-3">What to ask {first}</span>
          <p className="t-body">
            Did you hire any of the {notPlaced} {notPlaced === 1 ? "person" : "people"} we did not place from SET {set.setNumber}? Who, on what salary, and from when?
          </p>
        </div>
      </WhoAndHow>
      {surcharge ? (
        <PanelSection title="ALREADY RAISED">
          <p className="t-body text-ink-2">
            A surcharge was raised: {surcharge.number}. {surcharge.about}
          </p>
        </PanelSection>
      ) : (
        <PanelSection title="LOG IT HERE">
          {c.mayManage ? (
            <>
              <form action={confirmUnreportedHire} className="flex flex-col gap-3">
                <input type="hidden" name="setId" value={set.id} />
                <input type="hidden" name="back" value={close} />
                <PanelField label="Hire found: who was hired">
                  <ChoiceGroup name="candidateName" label="Who was hired" required options={set.candidates.map((x) => x.name)} />
                </PanelField>
                <PanelField label="Their salary a month (LKR)" hint="The surcharge is a share of the fee, so a number is needed.">
                  <input name="monthlySalary" type="number" min="1" step="1000" required className={panelInput} />
                </PanelField>
                <div>
                  <button type="submit" className={pillPrimary}>
                    Hire found: draft the surcharge
                  </button>
                </div>
              </form>
              <form action={dismissUnreportedHire} className="flex flex-col gap-3 border-t border-rule pt-4">
                <input type="hidden" name="setId" value={set.id} />
                <PanelField label="No hire: what they said, or how we know">
                  <input name="reason" required minLength={4} className={panelInput} />
                </PanelField>
                <div>
                  <button type="submit" className={pillSecondary}>
                    No hire: close the check
                  </button>
                </div>
              </form>
              <p className="t-small text-ink-3">not connected yet: the start date of the hire is not stored, so it is not asked.</p>
            </>
          ) : (
            <p className="t-body text-ink-2">Only a person who manages clients can record this.</p>
          )}
        </PanelSection>
      )}
      <WhatNext>Hire found: a surcharge invoice draft is made and waits for you to approve it. No hire: the answer is filed with the reason and the check is done.</WhatNext>
    </Panel>
  );
}
