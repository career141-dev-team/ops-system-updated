import {
  cancelPlacement,
  changeJoinDate,
  confirmNationality,
  draftTestimonialAsk,
  markNoShow,
  markTestimonialDone,
  recordNoShowChoice,
  saveClientDetails,
} from "@/app/actions";
import Panel, { PanelSection } from "@/app/ui/Panel";
import { SubmitButton } from "@/app/ui/SubmitButton";
import { ChoiceGroup, PanelField, panelInput, pillPrimary, pillSecondary } from "@/app/ui/figma";
import { colomboDate, colomboDateInWords } from "@/lib/calendar";
import { TESTIMONIAL_CHANNELS, feeAmount, feeMonthsFor, isExpat, moneyWhole } from "@/lib/money";
import { closeHref } from "@/lib/panel";

import type { TabProps } from "../ctx";
import ActionPanel, { type PanelPerson } from "./PanelKit";
import ReasonField from "./ReasonField";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const CANDIDATE_PHONE = "No phone saved yet — add it on the Offer tab.";
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
        people={[{ name: placement.candidateName, detail: "Candidate", phone: placement.candidatePhone ?? undefined, missing: CANDIDATE_PHONE }, ...clientPeople(c)]}
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
        people={[{ name: placement.candidateName, detail: "Candidate", phone: placement.candidatePhone ?? undefined, missing: CANDIDATE_PHONE }, ...clientPeople(c)]}
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
        people={[{ name: placement.candidateName, detail: "Candidate", phone: placement.candidatePhone ?? undefined, missing: CANDIDATE_PHONE }, ...clientPeople(c)]}
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

  if (sp.panel === "confirm-nationality" && (placement.state === "placed" || placement.state === "joined")) {
    const suggested = placement.nationality || placement.nationalityFromCv || "";
    const localMonths = placement.feeMonths > 0 ? placement.feeMonths : 1;
    const expatMonths = placement.expatFeeMonths && placement.expatFeeMonths > 0 ? placement.expatFeeMonths : 2;
    return (
      <ActionPanel
        kicker="Confirm nationality"
        title={`Confirm nationality for ${first}`}
        sub={`${where} > ${placement.candidateName}`}
        closeHref={close}
        why={[
          placement.nationalityFromCv
            ? `Read from prepared CV: ${placement.nationalityFromCv}`
            : "No nationality was found automatically in the prepared CV",
          `Sri Lankan placements are billed at ${localMonths} month${localMonths === 1 ? "" : "s"} of salary; non-Sri Lankan (expat) placements are billed at ${expatMonths} months (ESA clause 5.2)`,
          "Accounts cannot send the fee invoice until nationality is confirmed",
        ]}
        people={[{ name: placement.candidateName, detail: "Candidate", phone: placement.candidatePhone ?? undefined, missing: CANDIDATE_PHONE }]}
        hidden={{ placementId: placement.id }}
        next={`Saves the confirmed nationality on the placement${placement.invoiceId ? " and updates the draft invoice amount if needed" : ""}.`}
        action={confirmNationality}
      >
        <PanelField label="Nationality">
          <input
            name="nationality"
            type="text"
            required
            defaultValue={suggested}
            list="nationality-choices"
            placeholder="e.g. Sri Lankan, Indian, Pakistani, British"
            className={panelInput}
          />
          <datalist id="nationality-choices">
            <option value="Sri Lankan" />
            <option value="Indian" />
            <option value="Pakistani" />
            <option value="Bangladeshi" />
            <option value="British" />
            <option value="Maldivian" />
            <option value="Filipino" />
          </datalist>
        </PanelField>
        {suggested && (
          <p className="t-small text-ink-3">
            Currently reads as {isExpat(suggested) ? `Expat (${expatMonths} months' salary)` : `Local (${localMonths} month${localMonths === 1 ? "" : "s"}' salary)`}.
          </p>
        )}
      </ActionPanel>
    );
  }

  if (sp.panel === "testimonial" && placement.state === "joined") {
    const t = placement.testimonial ?? { candidate: "pending" as const, client: "pending" as const };
    const clientContact = c.client?.contacts?.[0] ?? null;
    return (
      <Panel
        kicker="Testimonial"
        title={`Testimonials for ${placement.candidateName}`}
        sub={`${where} > Joined ${placement.joinedAt ? shortDay(placement.joinedAt) : ""}`}
        closeHref={close}
      >
        <PanelSection title="Where it stands">
          <div className="flex flex-col gap-2">
            <p className="t-body text-ink-2">
              Candidate: <strong className="font-medium text-ink">{t.candidate === "done" ? "Done" : "Pending"}</strong>
            </p>
            <p className="t-body text-ink-2">
              Client: <strong className="font-medium text-ink">{t.client === "done" ? "Done" : "Pending"}</strong>
            </p>
            {t.channel && <p className="t-small text-ink-3">Last recorded channel: {t.channel}</p>}
          </div>
        </PanelSection>

        <PanelSection title="Draft a request">
          <form action={draftTestimonialAsk} className="flex flex-col gap-3">
            <input type="hidden" name="placementId" value={placement.id} />
            <input type="hidden" name="back" value={close} />
            <ChoiceGroup
              name="side"
              label="Who to ask"
              value={t.candidate === "pending" ? "candidate" : "client"}
              options={[
                { value: "candidate", label: "Candidate" },
                { value: "client", label: "Client" },
              ]}
            />
            <ChoiceGroup
              name="channel"
              label="Channel"
              value="LinkedIn"
              options={TESTIMONIAL_CHANNELS.map((ch) => ({ value: ch, label: ch }))}
            />
            <PanelField label="Email address">
              <input
                name="to"
                type="email"
                required
                defaultValue={clientContact?.email ?? ""}
                placeholder="person@company.com"
                className={panelInput}
              />
            </PanelField>
            <div>
              <SubmitButton id="draft-testimonial" className={pillSecondary}>
                Draft request for approval
              </SubmitButton>
            </div>
          </form>
        </PanelSection>

        <PanelSection title="Mark received">
          <form action={markTestimonialDone} className="flex flex-col gap-3">
            <input type="hidden" name="placementId" value={placement.id} />
            <input type="hidden" name="back" value={close} />
            <ChoiceGroup
              name="side"
              label="Which side"
              value={t.candidate === "pending" ? "candidate" : "client"}
              options={[
                { value: "candidate", label: "Candidate" },
                { value: "client", label: "Client" },
              ]}
            />
            <ChoiceGroup
              name="channel"
              label="Channel received on"
              value={t.channel ?? "LinkedIn"}
              options={TESTIMONIAL_CHANNELS.map((ch) => ({ value: ch, label: ch }))}
            />
            <div>
              <SubmitButton id="mark-testimonial-done" className={pillPrimary}>
                Mark done
              </SubmitButton>
            </div>
          </form>
        </PanelSection>
      </Panel>
    );
  }
  return null;
}
