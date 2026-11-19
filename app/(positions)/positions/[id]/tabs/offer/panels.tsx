import { cancelPlacement, changeJoinDate, markNoShow, recordNoShowChoice, saveClientDetails } from "@/app/actions";
import { ChoiceGroup, PanelField, panelInput } from "@/app/ui/figma";
import { colomboDate, colomboDateInWords } from "@/lib/calendar";
import { feeAmount, moneyWhole } from "@/lib/money";
import { missingInWords } from "@/lib/offerBoard";
import { closeHref } from "@/lib/panel";

import type { TabProps } from "../ctx";
import ActionPanel, { type PanelPerson } from "./PanelKit";
import ReasonField from "./ReasonField";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const CANDIDATE_PHONE = "Call and WhatsApp: not connected yet: the candidate phone from the TA System.";
export const shortDay = (at: number) => {
  const d = new Date(at + 5.5 * 3_600_000);
  return d.getUTCDate() + " " + MONTHS[d.getUTCMonth()];
};

/** The client's people, as the panels show them: the first standard contact on its record. */
export function clientPeople(c: TabProps["c"]): PanelPerson[] {
  return (c.client?.contacts ?? []).slice(0, 1).map((k) => ({
    name: k.name,
    detail: [k.role, c.clientName, k.phone].filter(Boolean).join(" · "),
    phone: k.phone,
    email: k.email,
  }));
}

/** Renders the open Offer-tab panel for `?panel=` and `?on=`, or nothing. */
export default function OfferPanels({ c, sp, path }: TabProps & { path: string }) {
  // No ?on= (a link from the page header): the first person still waiting to join.
  const placement = c.itsPlacements.find((p) => p.id === sp.on) ?? c.itsPlacements.find((p) => p.state === "placed") ?? null;
  if (!placement || !sp.panel) return null;
  const close = closeHref(path, sp);
  const first = placement.candidateName.split(" ")[0];
  const where = `${c.clientName} > ${c.position.title}`;
  const joinWords = placement.joinDate ? colomboDateInWords(placement.joinDate) : null;

  if (sp.panel === "record-address" && c.client) {
    const cl = c.client;
    const fee = placement.monthlySalary ? feeAmount(placement, placement.monthlySalary, placement) : null;
    return (
      <ActionPanel
        kicker="Record the address"
        title="Record the invoice address"
        sub={`${where} > ${placement.candidateName}${placement.joinDate ? ", joining " + shortDay(placement.joinDate) : ""}`}
        closeHref={close}
        why={[
          joinWords ? `${first} joins on ${joinWords}` : `${first} has no joining day yet`,
          cl.billingAddress ? "The invoice address on the client record is out of date or incomplete" : "The invoice address is missing on the client record",
          fee ? `The fee invoice is ${placement.feeMonths} month of salary, ${moneyWhole(fee, placement.currency)}` : "The fee is worked out once the package is recorded",
        ]}
        people={clientPeople(c)}
        askTitle="What to ask"
        ask="What is the full address the invoice goes to? Does it need a name or a PO number on it?"
        hidden={{ clientId: cl.id, billingName: cl.billingName, billingEmail: cl.billingEmail, groupName: cl.groupName ?? "", notes: cl.notes ?? "" }}
        next={"The address is kept on the client record, and the invoice draft for this joining uses it. The “Details missing” tag clears."}
        action={saveClientDetails}
      >
        <PanelField label="Invoice address">
          <textarea name="billingAddress" required rows={3} defaultValue={cl.billingAddress} placeholder="Type the address here" className={panelInput} />
        </PanelField>
      </ActionPanel>
    );
  }

  if (sp.panel === "move-doj" && placement.state === "placed") {
    const moves = placement.dojHistory.length;
    return (
      <ActionPanel
        kicker="Move the DOJ"
        title={`Move the DOJ for ${first}`}
        sub={`${where} > ${placement.candidateName}${placement.joinDate ? ", DOJ " + shortDay(placement.joinDate) : ""}`}
        closeHref={close}
        why={[
          joinWords ? `DOJ is ${joinWords}` : "No joining day is set yet",
          moves === 0
            ? "It has not moved yet"
            : `Moved ${moves} time${moves === 1 ? "" : "s"}: ` + placement.dojHistory.map((m) => `${m.from ? shortDay(m.from) : "unset"} to ${shortDay(m.to)} (${m.reason})`).join(", "),
        ]}
        people={[{ name: placement.candidateName, detail: "Candidate", missing: CANDIDATE_PHONE }, ...clientPeople(c)]}
        hidden={{ placementId: placement.id }}
        next={`The joining reminders and the invoice date move to the new date, and the TA System is told. The move count becomes ${moves + 1}.`}
        action={changeJoinDate}
      >
        <PanelField label="New date">
          <input type="date" name="joinDate" required defaultValue={placement.joinDate ? colomboDate(placement.joinDate) : ""} className={panelInput} />
        </PanelField>
        <ReasonField label="Reason" who={[first, ...(c.client?.contacts ?? []).slice(0, 1).map((k) => k.name), "Someone else"]} placeholder="Why is it moving?" />
      </ActionPanel>
    );
  }

  if (sp.panel === "offer-declined" && placement.state === "placed") {
    return (
      <ActionPanel
        kicker="Offer declined"
        title={`${placement.candidateName} declined the offer`}
        sub={`${where}${placement.monthlySalary ? " > Offer " + moneyWhole(placement.monthlySalary, placement.currency) : ""}`}
        closeHref={close}
        why={[
          `${first} is placed${joinWords ? ", due " + joinWords : ""} and has not joined`,
          "Nothing is invoiced when a placement is lost before joining",
        ]}
        people={[{ name: placement.candidateName, detail: "Candidate", missing: CANDIDATE_PHONE }, ...clientPeople(c)]}
        askTitle={`What to ask ${first}`}
        ask="Why did you decide no? Is there anything that would change it (salary, start date)?"
        hidden={{ placementId: placement.id }}
        next="The placement is cancelled and the TA System is told so it can reopen its own path. Nothing is invoiced. Promoting a back-up is not connected yet: for now the TA does it in the TA System."
        action={cancelPlacement}
      >
        <ReasonField
          label="Reason"
          chips={["Better offer elsewhere", "Salary too low", "Changed their mind", "Counter-offer from their employer", "Family or personal", "Other"]}
          placeholder="What they said, in a line"
        />
      </ActionPanel>
    );
  }

  if (sp.panel === "did-not-join" && (placement.state === "placed" || placement.state === "no_show")) {
    const chosen = placement.state === "no_show";
    return (
      <ActionPanel
        kicker="Did not join"
        title={`${placement.candidateName} did not join${joinWords ? " on " + joinWords : ""}`}
        sub={`${where}${joinWords ? " > Joining " + joinWords : ""}`}
        closeHref={close}
        why={[
          joinWords ? `Joining day is ${joinWords}` : "No joining day was set",
          chosen ? "It is recorded that they did not turn up" : "Nobody has recorded that they turned up",
          "The fee is not invoiced and no refund is due when a person does not join",
        ]}
        people={[{ name: placement.candidateName, detail: "Candidate", missing: CANDIDATE_PHONE }, ...clientPeople(c)]}
        askTitle={`What to ask ${first}`}
        ask="Where are you? Did you take another job? Will you still join, and when?"
        hidden={{ placementId: placement.id }}
        next="Replace: the search reopens with the same TA and a new person is sought. Stop: the role is closed and the posts come down. No invoice is made and no refund is owed."
        action={chosen ? recordNoShowChoice : markNoShow}
        blocked={chosen && placement.noShowChoice ? "The client's choice is already recorded: " + placement.noShowChoice + "." : undefined}
      >
        {!chosen && (
          <ReasonField
            label="Reason"
            chips={["Took another job", "Changed their mind", "Personal or family", "Could not be reached", "Other"]}
            placeholder="What is known, in a line"
          />
        )}
        {chosen && (
          <PanelField label="The client chose">
            <ChoiceGroup
              name="choice"
              label="The client chose"
              required
              value={placement.noShowChoice ?? undefined}
              options={[{ value: "replace", label: "Replace" }, { value: "stop", label: "Stop" }]}
            />
          </PanelField>
        )}
      </ActionPanel>
    );
  }
  return null;
}
