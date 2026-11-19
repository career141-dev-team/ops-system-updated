import { markRoleImpractical } from "@/app/actions";
import { ChoiceGroup, PanelField, panelInput } from "@/app/ui/figma";
import Panel, { PanelSection } from "@/app/ui/Panel";
import { meetingIn, templateFor } from "@/data/desk";
import { closeHref } from "@/lib/panel";

import type { TabProps } from "../ctx";
import CopyButton from "../shared/CopyButton";
import { dayMonth, first } from "../shared/fmt";
import { ContactBlock, DraftBox, NotConnected, WhyNow, saveBtn } from "../shared/PanelBits";

/** "<Role> is not practical" (frame 185:93): the role cannot be filled at that package. Closes it kindly and sets an invite-back date. */
export default function NotPracticalPanel({ c, sp }: TabProps) {
  const { db, position, client, clientName, requirement, me, now } = c;
  const path = `/positions/${position.id}`;
  const meeting = requirement?.meetingId ? meetingIn(db, requirement.meetingId) : null;
  const contact = client?.contacts?.[0] ?? null;
  const leadId = client?.leadId ?? requirement?.leadId ?? "";

  const tpl = templateFor(db, "role.impractical.reply");
  const message = tpl
    ? tpl.body
        .replace(/\{\{client\}\}/g, clientName)
        .replace(/\{\{position\}\}/g, position.title)
        .replace(/\{\{contact\}\}/g, contact ? first(contact.name) : "all")
        .replace(/\{\{opsPerson\}\}/g, first(me.name))
    : "";
  const tomorrow = new Date(now + 86_400_000 + 5.5 * 3_600_000).toISOString().slice(0, 10);

  return (
    <Panel kicker="Not practical" title={`${position.title} is not practical`} sub={[clientName, position.title, position.stage.replace(/_/g, " ")].join(" > ")} closeHref={closeHref(path, sp)}>
      <PanelSection title="Why now">
        <WhyNow
          lines={[
            meeting?.heldAt ? `After the requirement meeting on ${dayMonth(meeting.heldAt)}` : "The requirement has been recorded",
            requirement?.fields.salary ? `The package said is ${requirement.fields.salary}` : "No package is recorded yet",
            "Nobody on our side can fill it as it stands",
          ]}
        />
      </PanelSection>

      <PanelSection title="Who and how">
        <ContactBlock contact={contact} clientName={clientName} />
        {message && (
          <>
            <DraftBox label="Message to the client" text={message} />
            <div>
              <CopyButton text={message} label="Copy the message" />
            </div>
          </>
        )}
      </PanelSection>

      <PanelSection title="Log it here">
        {leadId ? (
          <form action={markRoleImpractical} className="flex flex-col gap-4">
            <input type="hidden" name="leadId" value={leadId} />
            <input type="hidden" name="back" value={closeHref(path, sp)} />
            <PanelField label="Why it is not practical">
              <ChoiceGroup
                name="reason"
                label="Why it is not practical"
                value="The pay is too low for this role"
                required
                options={[
                  { value: "The pay is too low for this role", label: "Pay too low" },
                  { value: "The location does not work for this role", label: "Location" },
                  { value: "The skills are not available at this package", label: "Skills not available" },
                  { value: "The client wants too much for this package", label: "Client wants too much" },
                  { value: "Other reason, see the requirement notes", label: "Other" },
                ]}
              />
            </PanelField>
            <PanelField label="Invite back on">
              <input type="date" name="inviteBackAt" min={tomorrow} required className={panelInput} />
            </PanelField>
            <div className="flex flex-col gap-2">
              <button type="submit" className={saveBtn + " self-start"}>
                Save
              </button>
            </div>
          </form>
        ) : (
          <NotConnected what="this role has no enquiry behind it, so it cannot be marked not practical from here" />
        )}
      </PanelSection>

      <PanelSection title="What happens next">
        <p className="t-body text-ink-2">The role closes as Not practical. An invite-back enquiry is set for the date you pick, so we ask {clientName} again. The message above is drafted for a person to approve before it goes.</p>
      </PanelSection>
    </Panel>
  );
}
