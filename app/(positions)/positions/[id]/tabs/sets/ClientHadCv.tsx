import Link from "next/link";

import Panel, { PanelSection } from "@/app/ui/Panel";
import { Avatar, EmptyState, pillPrimary } from "@/app/ui/figma";
import { recordCvClaim } from "@/app/actions";
import { OWNERSHIP_WORKING_DAYS, claimVerdict, ownershipWindow } from "@/lib/clientFeedback";
import { closeHref, panelHref } from "@/lib/panel";
import { numberOf } from "@/data/desk";
import { shortDay } from "@/lib/setsBoard";

import type { TabProps } from "../ctx";
import { WhatNext, WhoAndHow, WhyNow, rolePath, trail } from "./shared";

/** R2 client-had-cv (185:381). `on` is the candidate's application id; with none, pick who. */
export default function ClientHadCv({ c, sp }: TabProps) {
  const close = closeHref(rolePath(c), sp);
  const path = rolePath(c);
  const sent = c.itsSets.filter((s) => s.state === "sent");
  const hit = sent.flatMap((s) => s.candidates.map((x) => ({ s, x }))).find(({ x }) => x.applicationTaId === sp.on);

  if (!hit) {
    const rows = sent.flatMap((s) => s.candidates.filter((x) => !x.decision && !x.claimedAt).map((x) => ({ s, x })));
    return (
      <Panel kicker="Client already had this CV" title="Who did the client already have?" sub={trail(c)} closeHref={close}>
        {rows.length === 0 ? (
          <EmptyState title="No one to pick">Every person in a sent set already has an answer, or no set has gone yet.</EmptyState>
        ) : (
          <PanelSection title="PICK THE PERSON">
            {rows.map(({ s, x }) => (
              <Link key={s.id + x.applicationTaId} href={panelHref(path, sp, "client-had-cv", x.applicationTaId)} scroll={false} className="flex items-center gap-3.5 rounded-[12px] py-1.5 hover:bg-sunk/60">
                <Avatar name={x.name} size="40" tone="neutral" />
                <span className="t-body-m flex-1">{x.name}</span>
                <span className="t-small text-ink-3">SET {s.setNumber}</span>
              </Link>
            ))}
          </PanelSection>
        )}
      </Panel>
    );
  }

  const { s: set, x: who } = hit;
  const windowDays = numberOf(c.db, "set.ownershipWorkingDays", OWNERSHIP_WORKING_DAYS);
  const win = set.receivedAt === null ? null : ownershipWindow(set.receivedAt, c.db.holidays.map((h) => h.date), windowDays);
  // The same rule the action applies (claimVerdict): inside the window we take the client's word, after it we refuse.
  const verdict = win ? claimVerdict(win.closesAt, c.now) : null;
  const first = who.name.split(" ")[0];
  return (
    <Panel kicker="Client already had this CV" title={`Client already had ${who.name}`} sub={trail(c, set)} closeHref={close}>
      <WhyNow
        items={[
          `${c.clientName} says they already had this CV`,
          set.receivedAt ? `SET ${set.setNumber} reached them on ${shortDay(set.receivedAt)}` : "We do not know when they received this set",
          win ? `The ${windowDays} working day window ${win.closesAt > c.now ? "closes" : "closed"} on ${shortDay(win.closesAt)}` : "Without the date received, the window cannot be counted",
        ]}
      />
      <WhoAndHow c={c} />
      <PanelSection title="LOG IT HERE">
        <p className="t-small text-ink-3">Result: worked out from the day they received the set, not chosen by hand.</p>
        {verdict ? (
          <p className={"t-body-m rounded-[10px] px-3.5 py-3 " + (verdict.verdict === "dropped" ? "bg-bg-ok text-success" : "bg-bg-danger text-danger")}>
            {verdict.verdict === "dropped" ? `Within ${windowDays} working days: dropped, client-owned` : `After ${windowDays} working days: claim refused`}
          </p>
        ) : (
          <p className="t-body-m rounded-[10px] bg-sunk px-3.5 py-3">Cannot be recorded until the day they received the set is known.</p>
        )}
      </PanelSection>
      <WhatNext
        actions={
          c.mayManage && verdict ? (
            <form action={recordCvClaim}>
              <input type="hidden" name="setId" value={set.id} />
              <input type="hidden" name="applicationTaId" value={who.applicationTaId} />
              <input type="hidden" name="back" value={close} />
              <button type="submit" className={pillPrimary}>
                Save
              </button>
            </form>
          ) : undefined
        }
      >
        {verdict?.verdict === "dropped"
          ? `${first} leaves SET ${set.setNumber}. The other people in the set stay. A reply to the client is drafted for a person to read before it goes, and the TA System is told.`
          : `${first} stays with us. A reply that says the window has closed is drafted for a person to read before it goes.`}
      </WhatNext>
    </Panel>
  );
}
