import Link from "next/link";

import { approveTheHold, liftTheHold, openCloseByHand } from "@/app/actions";
import { ChoiceGroup, PanelField } from "@/app/ui/figma";
import Panel, { PanelSection } from "@/app/ui/Panel";
import { templateFor } from "@/data/desk";
import { closeHref, panelHref } from "@/lib/panel";

import type { TabProps } from "../ctx";
import CopyButton from "../shared/CopyButton";
import { dayMonth, first } from "../shared/fmt";
import { DraftBox, NotConnected, WhyNow, saveBtn } from "../shared/PanelBits";

const HOWS = [
  { key: "hold", label: "Put on hold" },
  { key: "close", label: "Close" },
  { key: "reopen", label: "Reopen the search" },
] as const;
const CLOSE_LIST = ["LinkedIn post closed", "TopJobs ad closed", "TA opening closed", "Client group told", "Client stays active or goes dormant"];

/** "Hold, close or reopen this role" (frame 185:182). One of three parts shows at a time, chosen with ?how=. */
export default function HoldPanel({ c, sp }: TabProps) {
  const { db, position, hold, client, clientName, me, itsSets } = c;
  const path = `/positions/${position.id}`;
  const how = (HOWS.find((h) => h.key === sp.how)?.key ?? (hold && hold.state === "held" ? "reopen" : "hold")) as (typeof HOWS)[number]["key"];
  const sent = itsSets.filter((s) => s.state === "sent" && s.sentAt).sort((a, b) => (b.sentAt as number) - (a.sentAt as number))[0];
  const live = c.itsInterviews.some((iv) => ["slots", "agreed", "booked", "reconfirmed"].includes(iv.state));
  const contact = client?.contacts?.[0] ?? null;

  const tpl = templateFor(db, "inactive.notice");
  const fill = (t: string) =>
    t
      .replace(/\{\{client\}\}/g, clientName)
      .replace(/\{\{position\}\}/g, position.title)
      .replace(/\{\{contact\}\}/g, contact ? first(contact.name) : "all")
      .replace(/\{\{opsPerson\}\}/g, first(me.name));
  const notice = tpl ? fill(tpl.body) : "";

  return (
    <Panel kicker="Hold, close or reopen" title="Hold, close or reopen this role" sub={[clientName, position.title, position.stage.replace(/_/g, " ")].join(" > ")} closeHref={closeHref(path, sp)}>
      <PanelSection title="Why now">
        <WhyNow
          lines={[
            `The role has been active since ${dayMonth(position.handedOverAt ?? position.createdAt)}`,
            sent ? `SET ${sent.setNumber} was sent on ${dayMonth(sent.sentAt as number)}${live ? "" : ", no one is in the interviews"}` : "No CV set has been sent yet",
            hold ? `A hold is ${hold.state === "proposed" ? "proposed" : "in place"} since ${dayMonth(hold.proposedAt)}: ${hold.reason}` : "Choose one of the 3 and fill only that part",
          ]}
        />
      </PanelSection>

      <PanelSection title="Who and how">
        <div className="flex flex-wrap gap-2">
          {HOWS.map((h) => (
            <Link
              key={h.key}
              scroll={false}
              replace
              href={panelHref(path, { view: "overview", how: h.key }, "hold-close-reopen")}
              className={"inline-flex items-center gap-1.5 rounded-full border px-4 py-[9px] text-[14px] font-medium leading-[22px] " + (h.key === how ? "border-ink bg-ink text-ink-inverse" : "border-rule bg-surface text-ink hover:bg-sunk")}
            >
              {h.label}
            </Link>
          ))}
        </div>
      </PanelSection>

      <PanelSection title="Log it here">
        {how === "hold" &&
          (hold && hold.state === "proposed" ? (
            <form action={approveTheHold} className="flex flex-col gap-4">
              <input type="hidden" name="holdId" value={hold.id} />
              <PanelField label="Put on hold">
                <ChoiceGroup name="reason" label="Why it goes on hold" value="Client freeze" options={["Client freeze", "Budget", "Waiting on the client", "Other"]} required />
              </PanelField>
              {notice && (
                <>
                  <DraftBox label="Notice to the client" text={notice} />
                  <div>
                    <CopyButton text={notice} label="Copy the notice" />
                  </div>
                </>
              )}
              <p className="t-small text-ink-3">Saving drafts the notice to {clientName}. It waits for a person to approve it before anything is sent.</p>
              <div>
                <button type="submit" className={saveBtn}>
                  Save
                </button>
              </div>
            </form>
          ) : hold ? (
            <p className="t-body text-ink-2">
              The role is already on hold since {dayMonth(hold.heldAt ?? hold.proposedAt)}: {hold.reason}. Use Reopen the search to lift it.
            </p>
          ) : (
            <NotConnected what="putting a role on hold by hand. A hold is proposed by the clock when a set goes quiet, and approved here" />
          ))}

        {how === "close" &&
          (position.openingTaId && c.mayManage ? (
            <form action={openCloseByHand} className="flex flex-col gap-4">
              <input type="hidden" name="positionId" value={position.id} />
              <PanelField label="Why it is closing">
                <ChoiceGroup
                  name="trigger"
                  label="Why it is closing"
                  value="client_stopped"
                  options={[
                    { value: "client_stopped", label: "The client stopped the search" },
                    { value: "impractical", label: "Not practical at that package" },
                  ]}
                  required
                />
              </PanelField>
              <PanelField label="Close: checklist" hint="Each one is ticked on the close list this opens. Nothing closes until every box is ticked.">
                <div className="flex flex-wrap gap-2">
                  {CLOSE_LIST.map((x) => (
                    <span key={x} className="rounded-full border border-rule bg-surface px-4 py-[9px] text-[14px] font-medium leading-[22px] text-ink-2">
                      {x}
                    </span>
                  ))}
                </div>
              </PanelField>
              <div>
                <button type="submit" className={saveBtn}>
                  Open the close list
                </button>
              </div>
            </form>
          ) : (
            <NotConnected what="closing needs TA's opening ID first" />
          ))}

        {how === "reopen" &&
          (hold ? (
            <form action={liftTheHold} className="flex flex-col gap-4">
              <input type="hidden" name="holdId" value={hold.id} />
              <PanelField label="Reopen the search">
                <ChoiceGroup name="reason" label="Why it reopens" value="Client wants to restart" options={["Client wants to restart", "New budget", "New opening", "Other"]} required />
              </PanelField>
              <div>
                <button type="submit" className={saveBtn}>
                  Save
                </button>
              </div>
            </form>
          ) : (
            <p className="t-body text-ink-2">This role is not on hold, so there is nothing to reopen.</p>
          ))}
      </PanelSection>

      <PanelSection title="What happens next">
        <p className="t-body text-ink-2">
          {how === "hold" && "Hold: the role leaves the daily list. The notice to the client is drafted and a person approves it before it goes."}
          {how === "close" && "Close: the close list opens, and the role is closed when every box is ticked."}
          {how === "reopen" && "Reopen: the hold is lifted and the role is active again with its old sets."}
        </p>
      </PanelSection>
    </Panel>
  );
}
