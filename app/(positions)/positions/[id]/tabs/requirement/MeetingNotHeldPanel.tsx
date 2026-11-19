import { markMeetingNotHeld } from "@/app/actions";
import { ChoiceGroup, PanelField } from "@/app/ui/figma";
import Panel, { PanelSection } from "@/app/ui/Panel";
import { meetingIn } from "@/data/desk";
import { closeHref } from "@/lib/panel";

import type { TabProps } from "../ctx";
import CopyButton from "../shared/CopyButton";
import { clock, first, weekdayDayMonth } from "../shared/fmt";
import { ContactBlock, DraftBox, NotConnected, WhyNow, saveBtn } from "../shared/PanelBits";

/** "Requirement meeting not held" (frame 185:2): the client did not join or moved it. A rebook task and the three-tries rule follow. */
export default function MeetingNotHeldPanel({ c, sp }: TabProps) {
  const { db, position, client, clientName, requirement, me } = c;
  const path = `/positions/${position.id}`;
  const meeting = requirement?.meetingId ? meetingIn(db, requirement.meetingId) : null;
  const contact = client?.contacts?.[0] ?? null;
  const hello = contact ? first(contact.name) : "all";
  const message = `Hello ${hello}, we missed you at our meeting about the ${position.title} role. Could we find another time? Tell us what suits you and we will book it. Thank you, ${first(me.name)}`;
  const phoneDigits = contact?.phone.replace(/[^\d]/g, "") ?? "";

  return (
    <Panel kicker="Meeting not held" title="Requirement meeting not held" sub={[clientName, position.title, "Requirement meeting"].join(" > ")} closeHref={closeHref(path, sp)}>
      <PanelSection title="Why now">
        <WhyNow
          lines={
            meeting
              ? [
                  `The meeting was booked for ${weekdayDayMonth(meeting.at)}, ${clock(meeting.at)}`,
                  meeting.state === "not_held" ? "It is already marked not held" : "It has not been marked held",
                  `This is rebook ${meeting.rebookCount + 1} of 3`,
                ]
              : ["No requirement meeting is recorded for this role"]
          }
        />
      </PanelSection>

      <PanelSection title="Who and how">
        <ContactBlock
          contact={contact}
          clientName={clientName}
          extra={
            phoneDigits ? (
              <a href={`https://wa.me/${phoneDigits}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-full border border-rule bg-surface px-3.5 py-2 text-[13px] font-medium leading-5 text-ink hover:bg-sunk">
                WhatsApp
              </a>
            ) : null
          }
        />
        <DraftBox label="Message to rebook" text={message} />
        <div>
          <CopyButton text={message} label="Copy the message" />
        </div>
      </PanelSection>

      <PanelSection title="Log it here">
        {meeting ? (
          <form action={markMeetingNotHeld} className="flex flex-col gap-4">
            <input type="hidden" name="meetingId" value={meeting.id} />
            <input type="hidden" name="back" value={closeHref(path, sp)} />
            <PanelField label="Why it was not held">
              <ChoiceGroup name="reason" label="Why it was not held" value="Client did not join" required options={["Client did not join", "Client asked to move", "We could not make it", "Other"]} />
            </PanelField>
            <label className="t-body flex items-center gap-2 text-ink-2">
              <input type="checkbox" name="clientReplied" />
              The client has replied
            </label>
            <div>
              <button type="submit" className={saveBtn}>
                Save
              </button>
            </div>
          </form>
        ) : (
          <NotConnected what="this role has no requirement meeting on record" />
        )}
      </PanelSection>

      <PanelSection title="What happens next">
        <p className="t-body text-ink-2">The meeting is marked not held and its clocks stop. After 3 tries that were not held, the system suggests closing the role. A client who has replied is not chased.</p>
      </PanelSection>
    </Panel>
  );
}
